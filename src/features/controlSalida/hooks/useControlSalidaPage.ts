import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useControlSalida, useUpdateControlSalida } from "./useControlSalida";
import type { ControlSalida } from "@/services/api/controlSalida";
import { useVehiculos, useConductores, vehiculosDeConductor } from "@/features/conductores";
import { useCeldas, useParqueaderos, useUpdateCelda, useIncidenteReporte } from "@/features/parqueaderos";
import { useCreateIncidente } from "@/features/incidentes";
import type { Incidente } from "@/services/api/incidentes";
import { useUsuarios } from "@/features/usuarios";
import type { Usuario } from "@/services/api/usuarios";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";
import { PAGE_SIZE } from "../lib/helpers";

/** Datos, filtros, paginación y eliminación del historial de entrada/salida. */
export function useControlSalidaPage() {
  const { user } = useAuth();
  const esConductor = user?.rol === ROLES.CONDUCTOR;
  const { data: controlesSalida = [], isLoading } = useControlSalida();
  const { data: vehiculos = [] } = useVehiculos();
  const { data: celdas = [] } = useCeldas();
  const { data: conductores = [] } = useConductores();
  const { data: parqueaderos = [] } = useParqueaderos();
  const updateControlSalidaMutation = useUpdateControlSalida();
  const updateCeldaMutation = useUpdateCelda();

  const miConductorId = useMemo(
    () => (esConductor ? conductores.find((c) => c.usuarioId === user!.id)?.id ?? null : null),
    [esConductor, conductores, user],
  );
  const misVehiculosIds = useMemo(
    () => (esConductor ? vehiculosDeConductor(vehiculos, miConductorId).map((v) => v.id) : []),
    [esConductor, vehiculos, miConductorId],
  );
  const controlesVisibles = useMemo(
    () => (esConductor ? controlesSalida.filter((control) => misVehiculosIds.includes(control.vehiculoId)) : controlesSalida),
    [esConductor, controlesSalida, misVehiculosIds],
  );
  // `mutateAsync` (no `.mutate`): quien llama necesita el `await`/try-catch para no
  // mostrar un toast de "éxito" cuando la mutación en realidad falla.

  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<"todos" | "en_parqueadero" | "finalizado">("todos");
  const [filterParqueadero, setFilterParqueadero] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const getVehiculo = useCallback((vehiculoId: string) => vehiculos.find((v) => v.id === vehiculoId), [vehiculos]);
  const getCelda = useCallback((celdaId: string) => celdas.find((c) => c.id === celdaId), [celdas]);
  const getParqueadero = useCallback((parqueaderoId: string) => parqueaderos.find((p) => p.id === parqueaderoId), [parqueaderos]);

  const getConductorVehiculo = useCallback(
    (vehiculoId: string) => {
      const vehiculo = getVehiculo(vehiculoId);
      if (!vehiculo) return null;
      return conductores.find((c) => c.id === vehiculo.conductorId);
    },
    [conductores, getVehiculo]
  );

  // El conductor ya trae su propio documento/nombre (ver services/api/conductores.ts) —
  // ya no hace falta pasar por un Usuario vinculado (opcional) para mostrarlos.
  const getUsuarioConductor = getConductorVehiculo;

  // Celdas disponibles (sin filtrar por tipo)
  const celdasDisponibles = useMemo(() => celdas.filter((c) => c.estado === "disponible"), [celdas]);
  const vehiculosEnParqueadero = useMemo(() => controlesVisibles.filter((c) => c.estado === "en_parqueadero"), [controlesVisibles]);
  const vehiculosSalidos = useMemo(() => controlesVisibles.filter((c) => c.estado === "finalizado"), [controlesVisibles]);

  const filteredControles = useMemo(
    () =>
      controlesVisibles
        .filter((control) => {
          const vehiculo = getVehiculo(control.vehiculoId);
          const celda = getCelda(control.celdaId);
          const usuario = getUsuarioConductor(control.vehiculoId);
          const parqueadero = celda ? getParqueadero(celda.parqueaderoId) : null;

          const q = search.toLowerCase();
          const matchesSearch =
            vehiculo?.placa.toLowerCase().includes(q) ||
            celda?.numero.toLowerCase().includes(q) ||
            usuario?.nombre.toLowerCase().includes(q) ||
            usuario?.numeroDocumento.includes(q) ||
            vehiculo?.marca.toLowerCase().includes(q);
          const matchesEstado = filterEstado === "todos" ? true : control.estado === filterEstado;
          const matchesParqueadero = filterParqueadero === "todos" ? true : parqueadero?.id === filterParqueadero;
          return matchesSearch && matchesEstado && matchesParqueadero;
        })
        // Orden por fecha/hora de SALIDA, lo más reciente primero. Los que siguen adentro no
        // tienen salida todavía: en vez de quedar al fondo (o romper la comparación con un
        // `new Date("")` inválido), van arriba —  son los registros vivos, los que el vigilante
        // necesita a mano— y entre ellos se ordenan por su hora de entrada más reciente.
        .sort((a, b) => {
          const salidaA = a.fechaSalida;
          const salidaB = b.fechaSalida;
          if (!salidaA && !salidaB) return new Date(b.fechaEntrada).getTime() - new Date(a.fechaEntrada).getTime();
          if (!salidaA) return -1;
          if (!salidaB) return 1;
          return new Date(salidaB).getTime() - new Date(salidaA).getTime();
        }),
    [controlesVisibles, search, filterEstado, filterParqueadero, getVehiculo, getCelda, getUsuarioConductor, getParqueadero]
  );

  useEffect(() => {
    setPage(1);
  }, [search, filterEstado, filterParqueadero]);

  const totalPages = Math.max(1, Math.ceil(filteredControles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedControles = useMemo(
    () => filteredControles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredControles, currentPage]
  );

  /* Un movimiento registrado es historia del parqueadero: no se borra, se consulta. La
     acción de eliminar desaparece y en su lugar queda la ficha completa. */
  const createIncidenteMutation = useCreateIncidente();
  const addIncidente = useCallback(
    (data: Omit<Incidente, "id" | "fecha">) => createIncidenteMutation.mutateAsync({ ...data, fecha: new Date().toISOString() }),
    [createIncidenteMutation],
  );

  /* Quién puede figurar como autor del reporte: quien lo escribe. Solo un Administrador
     puede ponerlo a nombre de otra persona (ver useParqueaderosData). */
  /* Leer el listado de usuarios es cosa de Administrador y Vigilante: el vigilante lo
     necesita para saber quién levantó un incidente y para dejar un reporte a nombre de quien
     se lo comunica (GET /usuarios, ver usuario.routes.js). Crear o editar cuentas sigue
     siendo solo del Administrador. */
  const puedeLeerUsuarios = user?.rol === ROLES.ADMIN || user?.rol === ROLES.VIGILANTE;
  const { data: usuarios = [] } = useUsuarios({ enabled: puedeLeerUsuarios });
  const usuariosReportantes = useMemo<Usuario[]>(() => {
    if (!user) return [];
    const propia: Usuario = {
      id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol,
      password: "", numero: user.numero ?? "", estado: "activo",
    };
    if (user.rol !== ROLES.ADMIN) return [propia];
    return [propia, ...usuarios.filter((u) => u.id !== user.id)];
  }, [usuarios, user]);

  const [detalle, setDetalle] = useState<ControlSalida | null>(null);
  const verDetalle = useCallback((control: ControlSalida) => setDetalle(control), []);

  /* Reportar desde aquí ahorra volver a buscar lo que esta pantalla ya tiene delante: la
     celda, el parqueadero y el vehículo del movimiento. Es el mismo formulario del plano
     (mismas reglas de qué exige un incidente y qué una novedad). */
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const reporte = useIncidenteReporte(
    { addIncidente },
    null,
    null,
    (m) => setReporteAbierto(m === "incidente"),
    { conductores, vehiculos },
  );
  const abrirReporteDe = useCallback((control: ControlSalida) => {
    const vehiculo = getVehiculo(control.vehiculoId);
    const celda = getCelda(control.celdaId);
    reporte.abrirReporte({
      parqueaderoId: control.parqueaderoId,
      celdaId: control.celdaId,
      vehiculoId: control.vehiculoId,
      etiqueta: `${celda ? `Celda ${celda.numero}` : "Sin celda"}${vehiculo ? ` · ${vehiculo.placa}` : ""}`,
    });
  }, [reporte, getVehiculo, getCelda]);

  // Registrar salida directo desde esta pantalla — antes el único lugar donde liberar una
  // celda era el mapa/tabla de Parqueaderos (ver useReservaCelda.ts#handleRequestLiberar,
  // mismo patrón: cierra el ControlSalida y refresca la celda con lo que ya movió el trigger
  // del backend tras el POST de salida). Se mantiene aquí como una llamada aparte, no una
  // reutilización de ese hook, porque ese vive atado al estado de modal de la pantalla de
  // Parqueaderos (celda activa, ocupante activo) que esta pantalla no tiene.
  const handleLiberar = useCallback(
    async (control: ControlSalida) => {
      try {
        await updateControlSalidaMutation.mutateAsync({
          id: control.id,
          data: { estado: "finalizado", fechaSalida: new Date().toISOString() },
        });
        await updateCeldaMutation.mutateAsync({ id: control.celdaId, data: { estado: "disponible" } });
        toast.success("Salida registrada. Celda liberada.");
      } catch (error) {
        console.error("Error registering salida from ControlSalidaPage:", error);
      }
    },
    [updateControlSalidaMutation, updateCeldaMutation]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterEstado("todos");
    setFilterParqueadero("todos");
  }, []);

  const hasActiveFilters = !!search || filterEstado !== "todos" || filterParqueadero !== "todos";

  return {
    controlesSalida: controlesVisibles, parqueaderos,
    search, setSearch, filterEstado, setFilterEstado, filterParqueadero, setFilterParqueadero,
    getVehiculo, getCelda, getParqueadero, getUsuarioConductor,
    celdasDisponibles, vehiculosEnParqueadero, vehiculosSalidos,
    filteredControles, paginatedControles,
    currentPage, totalPages, setPage,
    detalle, verDetalle, cerrarDetalle: () => setDetalle(null), usuariosReportantes,
    reporte, abrirReporteDe, reporteAbierto,
    clearFilters, hasActiveFilters, handleLiberar,
    isLoading,
  };
}
