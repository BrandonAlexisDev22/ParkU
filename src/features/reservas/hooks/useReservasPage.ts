import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";
import { useReservas, useReservasDeVehiculos, useRemoveReserva, useUpdateReserva, useCancelarReserva } from "./useReservas";
import type { Reserva } from "@/services/api/reservas";
import { useCeldas, useParqueaderos } from "@/features/parqueaderos";
import { useVehiculos, useConductores, vehiculoEstaParqueado, vehiculosDeConductor } from "@/features/conductores";
import { useControlSalida } from "@/features/controlSalida";
import type { EstadoReserva } from "../lib/constants";
import { seSolapan, buscarConflictoHorario as buscarConflictoHorarioEnLista } from "../lib/helpers";
import { estaATiempoDeCancelar, MARGEN_CANCELACION_MINUTOS, enPalabras } from "../lib/reglas";

/** Datos, filtros y eliminación del historial de reservas. */
export function useReservasPage() {
  const { user } = useAuth();
  const esConductor = user?.rol === ROLES.CONDUCTOR;
  const { data: vehiculos = [], isLoading: isLoadingVehiculos } = useVehiculos();
  const { data: celdas = [] } = useCeldas();
  const { data: conductores = [], isLoading: isLoadingConductores } = useConductores();
  const { data: parqueaderos = [] } = useParqueaderos();
  // `/entradas-salidas` es 403 para Comunidad SENA (confirmado en vivo) — solo se usa más abajo
  // dentro de `aceptarSolicitud`, una acción exclusiva de Admin/Vigilante, así que desactivarla
  // para ese rol no le quita nada real y evita el toast de error en cada visita a esta página.
  const { data: controlesSalida = [] } = useControlSalida({ enabled: !esConductor });

  // Un Conductor (Comunidad SENA) no puede pedir `GET /reservas` (403 documentado en
  // `getByVehiculo` de services/api/reservas.ts) — con `enabled: false` se evita disparar
  // esa consulta condenada a fallar (ahora que los errores de lectura sí muestran un toast
  // app-wide vía QueryCache.onError, un 403 acá dejaría de ser silencioso). En su lugar arma
  // su propio historial con `getByVehiculo` por cada uno de sus vehículos — la misma ruta que
  // ya usa el Dashboard de Comunidad SENA (ver useConductorDashboardData.ts).
  const miConductorId = useMemo(
    () => (esConductor ? conductores.find((c) => c.usuarioId === user!.id)?.id ?? null : null),
    [esConductor, user, conductores]
  );
  const misVehiculosIds = useMemo(
    () => (esConductor ? vehiculosDeConductor(vehiculos, miConductorId).map((v) => v.id) : []),
    [esConductor, vehiculos, miConductorId]
  );
  const { data: reservasAdmin = [], isLoading: isLoadingReservasAdmin } = useReservas({ enabled: !esConductor });
  const { reservas: reservasConductor, isLoading: isLoadingReservasConductor } = useReservasDeVehiculos(misVehiculosIds);
  const reservasTodas = esConductor ? reservasConductor : reservasAdmin;
  const isLoading = esConductor
    ? (isLoadingVehiculos || isLoadingConductores || isLoadingReservasConductor)
    : isLoadingReservasAdmin;

  const removeReservaMutation = useRemoveReserva();
  const cancelarReservaMutation = useCancelarReserva();
  const updateReservaMutation = useUpdateReserva();
  // `mutateAsync` (no `.mutate`): quien llama necesita el `await`/try-catch para no
  // mostrar un toast de "éxito" cuando la mutación en realidad falla.
  const deleteReserva = (id: string) => removeReservaMutation.mutateAsync(id);
  const updateReserva = (id: string, data: Partial<Omit<Reserva, "id">>) => updateReservaMutation.mutateAsync({ id, data });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewingReserva, setViewingReserva] = useState<Reserva | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<"todos" | EstadoReserva>("todos");
  const [confirmDelete, setConfirmDelete] = useState<Reserva | null>(null);
  const [confirmRechazar, setConfirmRechazar] = useState<Reserva | null>(null);
  const [confirmAceptar, setConfirmAceptar] = useState<Reserva | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<Reserva | null>(null);

  const getVehiculo = (id: string) => vehiculos.find((v) => v.id === id);
  const getCelda = (id: string) => celdas.find((c) => c.id === id);
  const getParqueadero = (id: string) => parqueaderos.find((p) => p.id === id);

  // La reserva ya trae su propio conductorId (relación directa en la API real);
  // si no vino, se cae de vuelta al dueño del vehículo reservado.
  const getConductorReserva = (reserva: Reserva) => {
    if (reserva.conductorId) return conductores.find((c) => c.id === reserva.conductorId) ?? null;
    const v = getVehiculo(reserva.vehiculoId);
    return v ? conductores.find((c) => c.id === v.conductorId) ?? null : null;
  };

  // `reservasTodas` ya viene acotada a las suyas para un Conductor (ver arriba, vía
  // `getByVehiculo`) — este filtro es una segunda comprobación por defensa en profundidad,
  // no la fuente primaria de la restricción.
  const reservas = useMemo(() => {
    if (!esConductor) return reservasTodas;
    return reservasTodas.filter((r) => getConductorReserva(r)?.id === miConductorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservasTodas, esConductor, miConductorId, conductores, vehiculos]);

  const counts = {
    pendiente: reservas.filter((r) => r.estado === "pendiente").length,
    activa: reservas.filter((r) => r.estado === "activa").length,
    completada: reservas.filter((r) => r.estado === "completada").length,
    cancelada: reservas.filter((r) => r.estado === "cancelada").length,
  };

  const filteredReservas = useMemo(() => {
    return reservas
      .filter((reserva) => {
        const vehiculo = getVehiculo(reserva.vehiculoId);
        const celda = getCelda(reserva.celdaId);
        const conductor = getConductorReserva(reserva);
        const q = search.toLowerCase();

        const matchesSearch =
          vehiculo?.placa.toLowerCase().includes(q) ||
          celda?.numero.toLowerCase().includes(q) ||
          conductor?.nombre.toLowerCase().includes(q) ||
          reserva.fechaReserva.includes(search);

        const matchesEstado = filterEstado === "todos" || reserva.estado === filterEstado;
        return matchesSearch && matchesEstado;
      })
      .sort((a, b) => {
        // Más próximas primero (fecha + hora de inicio)
        const da = `${a.fechaReserva} ${a.horaInicio}`;
        const db = `${b.fechaReserva} ${b.horaInicio}`;
        return da.localeCompare(db);
      });
    // Igual que en useIncidentesData: getVehiculo/getCelda/getConductorReserva se recrean en
    // cada render, pero dependen de `vehiculos`/`celdas`/`conductores`, que solo cambian cuando
    // cambia la consulta; el memo se recalcula con `reservas`, que cambia a la vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservas, search, filterEstado]);

  const handleDelete = (reserva: Reserva) => setConfirmDelete(reserva);

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    // Solo se puede eliminar una reserva "pendiente" — una ya gestionada (activa, rechazada,
    // completada, cancelada) es historial/rastro de auditoría y no debe poder borrarse
    // permanentemente. Esto es defensa en profundidad: `ReservaRow` ya oculta el botón de
    // eliminar para esos casos, pero el hook se valida a sí mismo por si se llama directo.
    if (confirmDelete.estado !== "pendiente") {
      toast.error("Solo se pueden eliminar reservas pendientes; el historial se conserva para auditoría.");
      setConfirmDelete(null);
      return;
    }
    try {
      // La celda NO se toca: una reserva pendiente no la retiene (solo la retiene una
      // aceptada, y de eso se encarga el backend). Ponerla "disponible" desde aquí podía
      // liberar una celda que en realidad estaba reservada por otra reserva ya aceptada, o
      // incluso ocupada por un vehículo dentro.
      await deleteReserva(confirmDelete.id);
      toast.success("Reserva eliminada correctamente");
      setConfirmDelete(null);
    } catch (error) {
      // El toast de error ya lo muestra el manejador centralizado de mutaciones
      // (services/core/queryFactory.ts).
      console.error("Error deleting reserva:", error);
    }
  };

  const activeFiltersCount = [search, filterEstado !== "todos" ? filterEstado : ""].filter(Boolean).length;
  const clearFilters = () => {
    setSearch("");
    setFilterEstado("todos");
  };

  // Solo Admin/Vigilante gestionan solicitudes — un Conductor puede solicitar una reserva,
  // pero no aprobar la suya (ni la de nadie).
  const puedeGestionarSolicitudes = user?.rol === ROLES.ADMIN || user?.rol === ROLES.VIGILANTE;
  // Ordenadas por fecha/hora de inicio para atender primero lo más próximo, igual que la tabla.
  const solicitudesPendientes = useMemo(
    () => reservasTodas
      .filter((r) => r.estado === "pendiente")
      .sort((a, b) => `${a.fechaReserva} ${a.horaInicio}`.localeCompare(`${b.fechaReserva} ${b.horaInicio}`)),
    [reservasTodas]
  );

  // Contra reservas ya "activa" (aceptadas): esto SÍ bloquea, es un doble-booking real —
  // dos solicitudes "pendiente" pueden competir por la misma franja sin problema, el
  // conflicto real solo existe si se intenta aceptar una segunda vez la misma franja.
  // (`seSolapan`/`buscarConflictoHorario` viven en lib/helpers.ts — es la implementación de
  // referencia que también usa useReservaCelda.ts al crear una reserva desde Parqueaderos.)
  const buscarConflictoHorario = (reserva: Reserva): Reserva | null =>
    buscarConflictoHorarioEnLista(reserva, reservasTodas, { excludeId: reserva.id });

  const aceptarSolicitud = async (reserva: Reserva) => {
    const conflicto = buscarConflictoHorario(reserva);
    if (conflicto) {
      const vehiculoConflicto = getVehiculo(conflicto.vehiculoId);
      toast.error(
        `No se puede aceptar: choca con la reserva de ${vehiculoConflicto?.placa ?? "otro vehículo"} ` +
        `del ${conflicto.fechaReserva} de ${conflicto.horaInicio} a ${conflicto.horaFin} en la misma celda.`
      );
      return;
    }

    // El vehículo pudo haberse estacionado en otro lado mientras esta solicitud esperaba
    // aprobación — eso sí se revalida antes de aceptar (a diferencia de "otra reserva", donde
    // es normal que el mismo vehículo tenga más de una solicitud pendiente compitiendo a la
    // vez; la que no se acepte se resuelve más abajo o por conflicto de horario).
    const vehiculoSolicitud = getVehiculo(reserva.vehiculoId);
    if (vehiculoSolicitud && vehiculoEstaParqueado(vehiculoSolicitud.id, controlesSalida)) {
      toast.error(`No se puede aceptar: el vehículo ${vehiculoSolicitud.placa} ya está estacionado en un parqueadero.`);
      return;
    }

    try {
      // Aceptar basta: el backend deja la celda RESERVADA en la misma operación (y no la
      // toca si mientras tanto se ocupó o entró en mantenimiento). Forzarla desde aquí
      // podía pisar ese estado.
      await updateReserva(reserva.id, { estado: "activa" });

      // Otras solicitudes "pendiente" de la MISMA celda que pedían una franja que ahora ya
      // no está disponible (se solapan con la que se acaba de aceptar) quedan sin sentido —
      // se rechazan automáticamente en vez de dejarlas colgadas hasta que alguien las gestione
      // a mano o venzan solas por el auto-vencimiento (ver useReservaAutoExpiry).
      const otrasEnConflicto = reservasTodas.filter(
        (r) => r.id !== reserva.id && r.celdaId === reserva.celdaId && r.estado === "pendiente" && seSolapan(reserva, r)
      );
      for (const otra of otrasEnConflicto) {
        await updateReserva(otra.id, {
          estado: "rechazada",
          motivoRechazo: "Rechazada automáticamente: la celda quedó ocupada por otra reserva aceptada en el mismo horario.",
        });
      }

      toast.success(
        otrasEnConflicto.length > 0
          ? `Solicitud aceptada — la celda queda reservada. ${otrasEnConflicto.length} solicitud(es) en conflicto se rechazaron automáticamente.`
          : "Solicitud aceptada — la celda queda reservada."
      );
    } catch (error) {
      // El toast de error ya lo muestra el manejador centralizado de mutaciones
      // (services/core/queryFactory.ts).
      console.error("Error accepting reserva:", error);
    }
  };

  /**
   * Quién puede cancelar una reserva: quien gestiona el parqueadero, cualquiera y a
   * cualquier hora (atiende el mostrador); el resto, solo las suyas y mientras falte al
   * menos la media hora de margen. Es la misma regla que aplica el backend en
   * PATCH /reservas/:id/cancelar, repetida aquí solo para decidir si se muestra el botón.
   */
  const puedeCancelar = (reserva: Reserva) => {
    if (reserva.estado !== "pendiente" && reserva.estado !== "activa") return false;
    if (puedeGestionarSolicitudes) return true;
    const esSuya = !!miConductorId && getConductorReserva(reserva)?.id === miConductorId;
    return esSuya && estaATiempoDeCancelar(reserva);
  };

  const handleCancelar = (reserva: Reserva) => setConfirmCancelar(reserva);

  const confirmCancelarAction = async (motivo: string) => {
    if (!confirmCancelar) return;
    if (!motivo.trim()) {
      toast.error("Debe ingresar un motivo para cancelar la reserva.");
      return;
    }
    // Segunda guarda: el botón ya no se muestra fuera de plazo, pero el diálogo pudo quedar
    // abierto justo cuando se cumplía la media hora.
    if (!puedeGestionarSolicitudes && !estaATiempoDeCancelar(confirmCancelar)) {
      toast.error(`Solo puedes cancelar hasta ${enPalabras(MARGEN_CANCELACION_MINUTOS)} antes de la hora de inicio.`);
      setConfirmCancelar(null);
      return;
    }
    try {
      await cancelarReservaMutation.mutateAsync({ id: confirmCancelar.id, motivo: motivo.trim() });
      toast.success("Reserva cancelada.");
      setConfirmCancelar(null);
    } catch (error) {
      // El aviso de error lo muestra la propia mutación (ver useCancelarReserva).
      console.error("Error cancelling reserva:", error);
    }
  };

  // Rechazar exige un motivo (obligatorio en el backend) — `handleRechazar` solo abre el
  // modal de confirmación; `confirmRechazarAction` es la que realmente envía el motivo.
  const handleRechazar = (reserva: Reserva) => setConfirmRechazar(reserva);

  const confirmRechazarAction = async (motivo: string) => {
    if (!confirmRechazar) return;
    // El motivo es obligatorio en el backend al rechazar — `ConfirmRechazarReservaModal` ya
    // bloquea su propio botón de confirmar sin motivo, pero esa es solo una guarda de UI.
    // Esta es la guarda real: protege el hook aunque se llame directo (p. ej. desde un test
    // o un futuro sitio de llamada) sin pasar por el modal.
    if (!motivo.trim()) {
      toast.error("Debe ingresar un motivo para rechazar la reserva.");
      return;
    }
    try {
      await updateReserva(confirmRechazar.id, { estado: "rechazada", motivoRechazo: motivo });
      toast.success("Solicitud rechazada.");
      setConfirmRechazar(null);
    } catch (error) {
      // El toast de error ya lo muestra el manejador centralizado de mutaciones
      // (services/core/queryFactory.ts).
      console.error("Error rejecting reserva:", error);
    }
  };

  const handleAceptar = (reserva: Reserva) => setConfirmAceptar(reserva);

  const confirmAceptarAction = async () => {
    if (!confirmAceptar) return;
    try {
      await aceptarSolicitud(confirmAceptar);
      setConfirmAceptar(null);
    } catch (error) {
      console.error("Error confirming accept reserva:", error);
    }
  };

  return {
    reservas, viewOpen, setViewOpen, viewingReserva, setViewingReserva,
    search, setSearch, filterEstado, setFilterEstado, confirmDelete, setConfirmDelete,
    confirmRechazar, setConfirmRechazar,
    confirmAceptar, setConfirmAceptar,
    getVehiculo, getCelda, getParqueadero, getConductorReserva,
    counts, filteredReservas, handleDelete, confirmDeleteAction,
    puedeCancelar, handleCancelar, confirmCancelar, setConfirmCancelar, confirmCancelarAction,
    puedeGestionarSolicitudes, solicitudesPendientes, aceptarSolicitud, handleRechazar, confirmRechazarAction,
    handleAceptar, confirmAceptarAction,
    miConductorId, celdas, parqueaderos, vehiculos, controlesSalida, reservasTodas,
    activeFiltersCount, clearFilters, isLoading,
  };
}
