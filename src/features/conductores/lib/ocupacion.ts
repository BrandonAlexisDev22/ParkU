/**
 * Un vehículo (o cualquier otro del mismo conductor) que ya está estacionado o tiene una
 * reserva pendiente/activa no puede reservarse ni estacionarse de nuevo hasta que esa
 * vinculación se libere. Se comparte entre el ingreso de vehículos, la reserva directa
 * (Admin/Vigilante) y la solicitud de reserva (Conductor) para no repetir la misma regla
 * tres veces con criterios distintos.
 */
import type { Vehiculo } from "@/services/api/vehiculos";
import type { ControlSalida } from "@/services/api/controlSalida";
import type { Reserva } from "@/services/api/reservas";

const RESERVA_ESTADOS_ACTIVOS = new Set(["pendiente", "activa"]);

/**
 * ¿Este vehículo es de este conductor? Cuenta tanto si es el propietario principal como si
 * está vinculado como copropietario.
 *
 * Vale la pena la función porque el matiz se pasa por alto: al vincular un vehículo existente
 * a otro conductor, el `conductorId` NO cambia (sigue siendo el del dueño principal) y el
 * vínculo queda en `copropietarios`. Filtrar solo por `conductorId` — que es lo que hacía
 * media aplicación — dejaba al copropietario sin ver su propio vehículo en los selectores de
 * reserva y de ingreso, aunque en su ficha sí apareciera.
 */
export function esDeConductor(vehiculo: Pick<Vehiculo, "conductorId" | "copropietarios">, conductorId: string): boolean {
  const idConductor = String(conductorId);
  return String(vehiculo.conductorId) === idConductor ||
    !!vehiculo.copropietarios?.some((p) => String(p.id) === idConductor);
}

/** Los vehículos que puede usar un conductor: los suyos y los que copropieta. */
export function vehiculosDeConductor<T extends Pick<Vehiculo, "conductorId" | "copropietarios">>(
  vehiculos: T[],
  conductorId: string | null | undefined,
): T[] {
  if (!conductorId) return [];
  return vehiculos.filter((v) => esDeConductor(v, conductorId));
}

/**
 * Los vehículos que se pueden ofrecer para operar (reservar, estacionar): solo los activos.
 *
 * Un vehículo se apaga con la cuenta de su dueño (ver usuario.service en la API): si esa
 * persona ya no puede entrar al sistema, tampoco debe seguir apareciendo en el mostrador a
 * través de sus vehículos. Los que comparte con otro propietario activo NO se apagan, así
 * que esos siguen aquí — es el vehículo el que dice si puede operar, no quién lo consulta.
 */
export function vehiculosOperables<T extends Pick<Vehiculo, "estado">>(vehiculos: T[]): T[] {
  return vehiculos.filter((v) => v.estado === "activo");
}

function hoyISO(): string {
  const ahora = new Date();
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
}

function aplicaFecha(reserva: Pick<Reserva, "fechaReserva">, fechaObjetivo?: string): boolean {
  const fecha = fechaObjetivo ?? hoyISO();
  if (!reserva.fechaReserva) return fecha === hoyISO();
  return reserva.fechaReserva === fecha;
}

export function vehiculoEstaParqueado(vehiculoId: string, controlesSalida: ControlSalida[], fechaObjetivo?: string): boolean {
  const fecha = fechaObjetivo ?? hoyISO();
  if (fecha !== hoyISO()) return false;
  return controlesSalida.some((cs) => cs.estado === "en_parqueadero" && cs.vehiculoId === vehiculoId);
}

export function reservaActivaDe(vehiculoId: string, reservas: Reserva[], fechaObjetivo?: string): Reserva | undefined {
  return reservas.find((r) => r.vehiculoId === vehiculoId && RESERVA_ESTADOS_ACTIVOS.has(r.estado) && aplicaFecha(r, fechaObjetivo));
}

export interface MotivoNoDisponible {
  motivo: string;
}

/** Por qué un vehículo puntual no está disponible para una reserva/ingreso nuevo, o `null`
 *  si está libre. No mira a los demás vehículos del mismo conductor — ver
 *  `otroVehiculoDelConductorEnUso` para esa parte. */
export function vehiculoNoDisponible(
  vehiculo: Pick<Vehiculo, "id" | "placa">,
  controlesSalida: ControlSalida[],
  reservas: Reserva[],
  fechaObjetivo?: string,
): MotivoNoDisponible | null {
  if (vehiculoEstaParqueado(vehiculo.id, controlesSalida, fechaObjetivo)) {
    return { motivo: `El vehículo ${vehiculo.placa} ya está estacionado en un parqueadero.` };
  }
  const reserva = reservaActivaDe(vehiculo.id, reservas, fechaObjetivo);
  if (reserva) {
    return {
      motivo: `El vehículo ${vehiculo.placa} ya tiene una reserva ${reserva.estado === "activa" ? "activa" : "pendiente"} en otra celda.`,
    };
  }
  return null;
}

/** Igual que `vehiculoNoDisponible`, pero para los DEMÁS vehículos del mismo conductor: un
 *  conductor solo puede tener un vehículo suyo en uso (parqueado o reservado) a la vez —
 *  mientras uno esté vinculado activamente, el resto de su flota queda bloqueada. */
export function otroVehiculoDelConductorEnUso(
  conductorId: string,
  vehiculoIdActual: string | null,
  vehiculos: Vehiculo[],
  controlesSalida: ControlSalida[],
  reservas: Reserva[],
  fechaObjetivo?: string,
): MotivoNoDisponible | null {
  const otros = vehiculos.filter((v) => esDeConductor(v, conductorId) && v.id !== vehiculoIdActual);
  for (const otro of otros) {
    const motivo = vehiculoNoDisponible(otro, controlesSalida, reservas, fechaObjetivo);
    if (motivo) {
      return { motivo: `Este conductor ya tiene otro vehículo en uso (${otro.placa}). Libéralo antes de continuar con este.` };
    }
  }
  return null;
}
