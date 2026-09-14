import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";
import { useParqueaderos, useCeldas } from "@/features/parqueaderos";
import { useControlSalida } from "@/features/controlSalida";
import { useVehiculos, useConductores } from "@/features/conductores";
import { useUsuarios } from "@/features/usuarios";
import type { Usuario } from "@/services/api/usuarios";
import type { Incidente, ClaseNovedad } from "@/services/api/incidentes";
import {
  useIncidentes,
  useCreateIncidente,
  useUpdateIncidente,
  useRemoveIncidente,
} from "./useIncidentes";
import { ESTADO_CONFIG, type EstadoIncidente } from "../lib/constants";
import { compararIncidentes } from "../lib/orden";
import { esEstadoFinal, puedeCambiarA, requiereMotivo } from "../lib/transiciones";

interface UseIncidentesDataOptions {
  /** El listado de incidentes hay que intentarlo igual para Comunidad SENA — no existe otra
   *  ruta que le dé su propio historial (ver useConductorIncidentesData.ts) — pero ese hook ya
   *  construye su propio mensaje persistente de error en pantalla; pasar `true` evita que el
   *  toast global de App.tsx muestre una segunda copia redundante del mismo aviso. */
  silentIncidentesError?: boolean;
}

/** Datos base de Incidentes: queries, mutaciones, lookups hacia Parqueaderos/Celdas, stats y filtrado. */
export function useIncidentesData(options?: UseIncidentesDataOptions) {
  const { user } = useAuth();
  const esConductor = user?.rol === ROLES.CONDUCTOR;
  const { data: parqueaderos = [] } = useParqueaderos();
  const { data: celdas = [] } = useCeldas();
  const { data: vehiculos = [] } = useVehiculos();
  const { data: conductores = [] } = useConductores();
  // También se usa en la vista del conductor para identificar las celdas donde están
  // estacionados sus propios vehículos.
  const { data: controlesSalida = [] } = useControlSalida();
  // Solo Admin puede listar /api/usuarios — para Vigilante/Conductor queda deshabilitada (antes
  // solo quedaba en [] tras un 403 real; ahora que las lecturas fallidas sí avisan globalmente,
  // desactivarla evita ese toast para dos roles que nunca iban a poder verla).
  /* Leer el listado de usuarios es cosa de Administrador y Vigilante: el vigilante lo
     necesita para saber quién levantó un incidente y para dejar un reporte a nombre de quien
     se lo comunica (GET /usuarios, ver usuario.routes.js). Crear o editar cuentas sigue
     siendo solo del Administrador. */
  const puedeLeerUsuarios = user?.rol === ROLES.ADMIN || user?.rol === ROLES.VIGILANTE;
  const { data: usuarios = [] } = useUsuarios({ enabled: puedeLeerUsuarios });
  const { data: incidentes = [], isLoading, isError } = useIncidentes({ silentError: options?.silentIncidentesError });
  const createIncidenteMutation = useCreateIncidente();
  const updateIncidenteMutation = useUpdateIncidente();
  const removeIncidenteMutation = useRemoveIncidente();
  // `mutateAsync` (no `.mutate`): quien llama necesita el `await`/try-catch para no
  // mostrar un toast de "éxito" ni cerrar su diálogo cuando la mutación en realidad falla.
  const addIncidente = (data: Omit<Incidente, "id" | "fecha">) => createIncidenteMutation.mutateAsync({ ...data, fecha: new Date().toISOString() });
  const updateIncidente = (id: string, data: Partial<Omit<Incidente, "id">>) =>
    updateIncidenteMutation.mutateAsync({ id, data });
  const deleteIncidente = (id: string) => removeIncidenteMutation.mutateAsync(id);

  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<"todos" | EstadoIncidente>("todos");
  /* Incidentes y novedades conviven en la misma lista pero se atienden distinto: sin poder
     separarlos, una observación de turno estorba a quien busca averías por resolver. */
  const [filterClase, setFilterClase] = useState<"todos" | ClaseNovedad>("todos");

  const parqueaderoPorId = useMemo(() => new Map(parqueaderos.map((p) => [p.id, p])), [parqueaderos]);
  const celdaPorId = useMemo(() => new Map(celdas.map((c) => [c.id, c])), [celdas]);
  const vehiculoPorId = useMemo(() => new Map(vehiculos.map((v) => [v.id, v])), [vehiculos]);

  const usuarioPorId = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);
  /* Quién puede quedar de encargado: Administrador o Vigilante, los dos roles que gestionan
     el parqueadero (es la misma regla del backend, en novedades.service.js). `usuarios`
     completo se conserva aparte para resolver el nombre de un incidente ya asignado, aunque
     esa persona haya cambiado de rol después.

     `GET /usuarios` es solo para Administrador, así que a un Vigilante esta lista le llega
     vacía; para que pueda hacerse cargo igual, se añade su propia cuenta. Es además la
     operación normal: el vigilante de turno toma el incidente que va a atender. */
  const usuariosAsignables = useMemo(() => {
    const gestores = usuarios.filter((u) => u.rol === ROLES.VIGILANTE || u.rol === ROLES.ADMIN);
    const puedeEncargarse = user && (user.rol === ROLES.VIGILANTE || user.rol === ROLES.ADMIN);
    if (puedeEncargarse && !gestores.some((u) => u.id === user.id)) {
      const propia: Usuario = {
        id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol,
        password: "", numero: user.numero ?? "", estado: "activo",
      };
      return [propia, ...gestores];
    }
    return gestores;
  }, [usuarios, user]);

  const nombreParqueadero = (id: string) => parqueaderoPorId.get(id)?.nombre ?? "—";
  const celdaDe = (id?: string) => (id ? celdaPorId.get(id) : undefined);
  const vehiculoDe = (id?: string) => (id ? vehiculoPorId.get(id) : undefined);
  /* Quién puede figurar como autor de un reporte: quien lo escribe. Solo un Administrador
     puede dejarlo a nombre de otra persona. */
  const usuariosReportantes = useMemo<Usuario[]>(() => {
    if (!user) return [];
    const propia: Usuario = {
      id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol,
      password: "", numero: user.numero ?? "", estado: "activo",
    };
    if (user.rol !== ROLES.ADMIN) return [propia];
    return [propia, ...usuarios.filter((u) => u.id !== user.id)];
  }, [usuarios, user]);

  const nombreUsuarioAsignado = (id?: string) => (id ? usuarioPorId.get(id)?.nombre : undefined);
  /* Quién reportó. La lista de usuarios solo la puede leer un Administrador, así que para el
     resto se cae al nombre de la propia cuenta cuando el reporte es suyo — que es el caso
     más frecuente— y a un guion cuando no hay forma de resolverlo. */
  const nombreUsuarioReporta = (id?: string) => {
    if (!id) return undefined;
    if (user && id === user.id) return user.nombre;
    return usuarioPorId.get(id)?.nombre;
  };
  /** El correo de una cuenta: es por donde se la contacta desde el detalle de un reporte. */
  const correoUsuario = (id?: string) => {
    if (!id) return undefined;
    if (user && id === user.id) return user.correo;
    return usuarioPorId.get(id)?.correo;
  };
  // Trazabilidad del incidente hacia la persona: novedad -> vehiculo_id -> conductor_principal
  // (no hay FK directa novedad->conductor, ver services/api/incidentes.ts).
  const conductorDe = (vehiculoId?: string) => {
    const veh = vehiculoDe(vehiculoId);
    return veh?.conductorId ? conductores.find((c) => c.id === veh.conductorId) : undefined;
  };

  // Quién ocupa una celda AHORA: se deriva del registro de entrada/salida abierto
  // (ver services/api/controlSalida.ts) — el vehículo ya no guarda su propia celda.
  const ocupanteDeCelda = (celdaId?: string) => {
    if (!celdaId) return null;
    const cs = controlesSalida.find((c) => c.celdaId === celdaId && c.estado === "en_parqueadero");
    if (!cs) return null;
    const veh = vehiculos.find((v) => v.id === cs.vehiculoId);
    if (!veh) return null;
    const cond = conductores.find((c) => c.id === (cs.conductorId || veh.conductorId));
    return { vehiculo: veh, conductorNombre: cond?.nombre };
  };

  const pendientes = incidentes.filter((i) => i.estado === "pendiente").length;
  const enProceso = incidentes.filter((i) => i.estado === "en_proceso").length;
  const resueltos = incidentes.filter((i) => i.estado === "resuelto").length;

  /**
   * Cambia el estado de un incidente respetando las transiciones válidas
   * (lib/transiciones.ts): desde pendiente o en proceso se puede avanzar, mientras que
   * resuelto, rechazado y cancelado son finales y ya no admiten cambios. La tarjeta solo
   * ofrece los destinos válidos; estas guardas cubren cualquier otra vía de llamada.
   * El backend debe aplicar la misma regla.
   */
  const cambiarEstado = async (
    id: string,
    nuevoEstado: EstadoIncidente,
    extra?: { usuarioAsignadoId?: string; justificacionCierre?: string },
  ) => {
    const incidente = incidentes.find((i) => i.id === id);
    if (!incidente || (incidente.estado === nuevoEstado && !extra)) return;

    if (esEstadoFinal(incidente.estado)) {
      toast.error(`Un incidente ${ESTADO_CONFIG[incidente.estado].label.toLowerCase()} ya no puede cambiar de estado.`);
      return;
    }
    if (!puedeCambiarA(incidente.estado, nuevoEstado)) {
      toast.error("Ese cambio de estado no está permitido.");
      return;
    }

    /* Descartar un reporte sin decir por qué lo deja sin respuesta para quien se tomó el
       trabajo de levantarlo. Lo aplica también el backend (novedades.service.js); aquí evita
       enviar una petición que ya se sabe que va a fallar. El encargado, en cambio, se
       recomienda pero no se exige. */
    const motivo = extra?.justificacionCierre ?? incidente.justificacionCierre;
    if (requiereMotivo(nuevoEstado) && !motivo?.trim()) {
      toast.error(`Escribe el motivo para marcar el incidente como ${ESTADO_CONFIG[nuevoEstado].label.toLowerCase()}.`);
      return;
    }

    try {
      await updateIncidente(id, {
        estado: nuevoEstado,
        ...(extra?.usuarioAsignadoId ? { usuarioAsignadoId: extra.usuarioAsignadoId } : {}),
        ...(extra?.justificacionCierre ? { justificacionCierre: extra.justificacionCierre } : {}),
      });
      toast.success(`Incidente marcado como "${ESTADO_CONFIG[nuevoEstado].label}"`);
    } catch (error) {
      // El toast de error ya lo muestra el manejador centralizado de mutaciones
      // (services/core/queryFactory.ts).
      console.error("Error changing incidente estado:", error);
    }
  };

  const filteredIncidentes = useMemo(
    () =>
      incidentes
        .filter((inc) => {
          const q = search.toLowerCase();
          const pqNombre = nombreParqueadero(inc.parqueaderoId).toLowerCase();
          const celdaNumero = celdaDe(inc.celdaId)?.numero.toLowerCase() ?? "";
          const placa = (vehiculoDe(inc.vehiculoId)?.placa ?? "").toLowerCase();
          const matchesSearch =
            inc.descripcion.toLowerCase().includes(q) ||
            pqNombre.includes(q) ||
            celdaNumero.includes(q) ||
            placa.includes(q);
          const matchesEstado = filterEstado === "todos" ? true : inc.estado === filterEstado;
          const matchesClase = filterClase === "todos" ? true : inc.clase === filterClase;
          return matchesSearch && matchesEstado && matchesClase;
        })
        .sort(compararIncidentes),
    // nombreParqueadero/celdaDe/vehiculoDe son funciones nuevas en cada render, pero lo que
    // de verdad cambia el resultado son los mapas que consultan, ya declarados aquí.
    // Depender de las funciones haría que este memo se recalculara siempre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incidentes, search, filterEstado, filterClase, parqueaderoPorId, celdaPorId, vehiculoPorId]
  );

  const activeFiltersCount = [
    search,
    filterEstado !== "todos" ? filterEstado : "",
    filterClase !== "todos" ? filterClase : "",
  ].filter(Boolean).length;
  const clearFilters = () => {
    setSearch("");
    setFilterEstado("todos");
  };

  return {
    parqueaderos,
    celdas,
    vehiculos,
    usuarios,
    usuariosAsignables,
    usuariosReportantes,
    puedeRegistrarNovedades: !esConductor,
    incidentes,
    addIncidente,
    updateIncidente,
    deleteIncidente,
    search,
    setSearch,
    filterEstado,
    filterClase,
    setFilterClase,
    setFilterEstado,
    nombreParqueadero,
    celdaDe,
    vehiculoDe,
    conductorDe,
    nombreUsuarioAsignado,
    nombreUsuarioReporta,
    correoUsuario,
    /* Abrir la ficha de una persona desde el reporte es cosa de quien gestiona: Comunidad SENA
       ve el nombre y el correo, pero Usuarios y Conductores no son módulos suyos. */
    puedeAbrirPerfiles: !esConductor,
    ocupanteDeCelda,
    pendientes,
    enProceso,
    resueltos,
    cambiarEstado,
    filteredIncidentes,
    activeFiltersCount,
    clearFilters,
    isLoading,
    isError,
  };
}

export type IncidentesData = ReturnType<typeof useIncidentesData>;
