import { useState } from "react";
import {
  IconBell as Bell,
  IconCalendar as Calendar,
  IconCar as Car,
  IconCheck as Check,
  IconMapPin as MapPin,
  IconUser as User,
  IconMail as Mail,
  IconPhone as Phone,
  IconId as IdCard,
  IconBuilding as Building,
  IconX as X,
} from "@tabler/icons-react";
import { theme } from "@/styles/theme";
import type { Reserva } from "@/services/api/reservas";
import type { Vehiculo } from "@/services/api/vehiculos";
import type { Celda } from "@/services/api/celdas";
import type { Conductor } from "@/services/api/conductores";
import type { Parqueadero } from "@/services/api/parqueaderos";

const C = theme;

interface SolicitudesPendientesPanelProps {
  solicitudes: Reserva[];
  getVehiculo: (id: string) => Vehiculo | undefined;
  getCelda: (id: string) => Celda | undefined;
  getParqueadero: (id: string) => Parqueadero | undefined;
  getConductorReserva: (reserva: Reserva) => Conductor | null | undefined;
  onAceptar: (reserva: Reserva) => void;
  onRechazar: (reserva: Reserva) => void;
}

/**
 * Sección de solicitudes de reserva pendientes (solo Admin/Vigilante): una reserva
 * creada por un Conductor queda "pendiente" y no ocupa la celda hasta que se acepta
 * aquí — antes cualquier reserva marcaba la celda como reservada de inmediato, sin
 * pasar por una aprobación real.
 */
export function SolicitudesPendientesPanel({
  solicitudes,
  getVehiculo,
  getCelda,
  getParqueadero,
  getConductorReserva,
  onAceptar,
  onRechazar,
}: SolicitudesPendientesPanelProps) {
  const [expandida, setExpandida] = useState<string | null>(null);

  if (solicitudes.length === 0) return null;

  return (
    <section
      style={{
        borderRadius: 16,
        border: `1px solid #FDE68A`,
        background: "#FFFBEB",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid #FDE68A",
        }}
      >
        <Bell size={16} color="#92400E" />
        <h3
          style={{ fontSize: 13, fontWeight: 800, color: "#92400E", margin: 0 }}
        >
          Solicitudes de reserva pendientes ({solicitudes.length})
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {solicitudes.map((reserva) => {
          const vehiculo = getVehiculo(reserva.vehiculoId);
          const celda = getCelda(reserva.celdaId);
          const parqueadero = celda
            ? getParqueadero(celda.parqueaderoId)
            : undefined;
          const conductor = getConductorReserva(reserva);

          return (
            <div
              key={reserva.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "12px 18px",
                borderTop: `1px solid #FEF3C7`,
                background: "#fff",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "rgba(57,169,0,.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Car size={15} color={C.primary} />
              </div>

              <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}
                  >
                    {vehiculo?.placa || "—"}
                  </span>
                  {conductor ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandida((actual) =>
                          actual === reserva.id ? null : reserva.id,
                        )
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        font: "inherit",
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: C.primary,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      · {conductor.nombre}
                    </button>
                  ) : (
                    <span
                      style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}
                    >
                      · Conductor sin datos
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      color: C.textLight,
                    }}
                  >
                    <MapPin size={10} /> {parqueadero?.nombre || "—"} · Celda{" "}
                    {celda?.numero || "—"}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      color: C.textLight,
                    }}
                  >
                    <Calendar size={10} /> {reserva.fechaReserva} ·{" "}
                    {reserva.horaInicio}–{reserva.horaFin}
                  </span>
                </div>
                {reserva.motivo && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: C.textLight,
                      marginTop: 3,
                      fontStyle: "italic",
                    }}
                  >
                    "{reserva.motivo}"
                  </div>
                )}
                {conductor && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 10,
                      background: "#F8FAFC",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 10.5,
                        color: C.textLight,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 700,
                          color: C.text,
                        }}
                      >
                        <User size={12} color={C.primary} /> Solicitud de:{" "}
                        {conductor.nombre}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Mail size={12} color={C.primary} />
                        {conductor.correo || "Sin correo"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Phone size={12} color={C.primary} />
                        {conductor.numeroTelefonico || "Sin teléfono"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Building size={12} color={C.primary} />
                        {conductor.tipoUsuarioNombre || "Sin tipo"}
                      </span>
                    </div>

                    {expandida === reserva.id && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10.5,
                            color: C.textLight,
                          }}
                        >
                          <IdCard size={12} color={C.primary} />{" "}
                          <span>
                            {conductor.tipoDocumento || "—"} ·{" "}
                            {conductor.numeroDocumento || "Sin documento"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10.5,
                            color: C.textLight,
                          }}
                        >
                          <Building size={12} color={C.primary} />{" "}
                          <span>
                            {conductor.tipoUsuarioNombre || "Sin tipo"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10.5,
                            color: C.textLight,
                          }}
                        >
                          <Building size={12} color={C.primary} />{" "}
                          <span>
                            {conductor.centroFormacion || "Sin centro"}
                          </span>
                        </div>
                      </div>
                    )}

                    {vehiculo && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          fontSize: 10.5,
                          color: C.textLight,
                        }}
                      >
                        <Car size={12} color={C.primary} />
                        <span>
                          <strong style={{ color: C.text }}>
                            {vehiculo.placa}
                          </strong>{" "}
                          · {vehiculo.marca || "—"} {vehiculo.modelo || "—"}
                        </span>
                        <span>· {vehiculo.color || "Sin color"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button
                  onClick={() => onRechazar(reserva)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.textLight,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <X size={13} /> Rechazar
                </button>
                <button
                  onClick={() => onAceptar(reserva)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 14px",
                    borderRadius: 9,
                    border: "none",
                    background: C.primary,
                    color: "#fff",
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Check size={13} /> Aceptar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
