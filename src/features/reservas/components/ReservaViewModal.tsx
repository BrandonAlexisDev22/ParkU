import { useNavigate } from "react-router-dom";
import {
  IconBan as Ban,
  IconCalendar as Calendar,
  IconCar as Car,
  IconClock as Clock,
  IconMapPin as MapPin,
  IconUserCircle as UserCircle2,
  IconX as X,
} from "@tabler/icons-react";
import { theme } from "@/styles/theme";
import type { Reserva } from "@/services/api/reservas";
import type { Vehiculo } from "@/services/api/vehiculos";
import type { Celda } from "@/services/api/celdas";
import type { Conductor } from "@/services/api/conductores";
import type { Parqueadero } from "@/services/api/parqueaderos";
import { ESTADO_CONFIG } from "../lib/constants";

const C = theme;

interface ReservaViewModalProps {
  reserva: Reserva;
  vehiculo: Vehiculo | undefined;
  celda: Celda | undefined;
  usuario: Conductor | null | undefined;
  parqueadero: Parqueadero | undefined;
  onClose: () => void;
}

/** Vista de solo lectura del detalle de una reserva. */
export function ReservaViewModal({
  reserva,
  vehiculo,
  celda,
  usuario,
  parqueadero,
  onClose,
}: ReservaViewModalProps) {
  const navigate = useNavigate();
  const cfg = ESTADO_CONFIG[reserva.estado];

  const conductorInfo = usuario
    ? [
        {
          label: "Tipo de usuario",
          value: usuario.tipoUsuarioNombre || "Sin tipo",
        },
        {
          label: "Documento",
          value: `${usuario.tipoDocumento || "—"} · ${usuario.numeroDocumento || "—"}`,
        },
        { label: "Correo", value: usuario.correo || "Sin correo" },
        {
          label: "Teléfono",
          value: usuario.numeroTelefonico || "Sin teléfono",
        },
        {
          label: "Centro de formación",
          value: usuario.centroFormacion || "Sin centro",
        },
        {
          label: "Regional",
          value: usuario.regionalFormacion || "Sin regional",
        },
        {
          label: "Programa",
          value: usuario.programaFormacion || "Sin programa",
        },
        { label: "Dirección", value: usuario.direccion || "Sin dirección" },
      ]
    : [];

  const items = [
    {
      label: "Conductor",
      value: usuario
        ? `${usuario.nombre} · ${usuario.numeroDocumento}`
        : "Sin conductor",
      icon: UserCircle2,
      onClick: usuario
        ? () =>
            navigate(`/app/conductores?q=${encodeURIComponent(usuario.nombre)}`)
        : undefined,
    },
    {
      label: "Vehículo",
      value: vehiculo?.placa || "—",
      icon: Car,
      onClick: undefined,
    },
    {
      label: "Celda",
      value: celda ? `Celda ${celda.numero}` : "—",
      icon: MapPin,
      onClick: celda
        ? () =>
            navigate(`/app/parqueaderos?q=${encodeURIComponent(celda.numero)}`)
        : undefined,
    },
    {
      label: "Parqueadero",
      value: parqueadero?.nombre || "—",
      icon: MapPin,
      onClick: parqueadero
        ? () =>
            navigate(
              `/app/parqueaderos?q=${encodeURIComponent(celda?.numero || parqueadero.nombre)}`,
            )
        : undefined,
    },
    {
      label: "Fecha de reserva",
      value: reserva.fechaReserva,
      icon: Calendar,
      onClick: undefined,
    },
    {
      label: "Horario",
      value: `${reserva.horaInicio} – ${reserva.horaFin}`,
      icon: Clock,
      onClick: undefined,
    },
  ];

  return (
    <div>
      <div
        style={{
          padding: "1.6rem 1.8rem 1.4rem",
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
          color: "#fff",
          borderRadius: "24px 24px 0 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,.07)",
            top: -80,
            right: -60,
          }}
        />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(255,255,255,.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Car size={24} />
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,.15)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>
          <h2
            style={{
              marginTop: 14,
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {vehiculo?.placa || "—"}
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.75)",
              marginTop: 4,
            }}
          >
            {vehiculo?.marca} {vehiculo?.modelo}
          </p>
          <div style={{ marginTop: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.25)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: cfg.dot,
                }}
              />
              {cfg.label}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "1.4rem 1.8rem" }}>
        {items.map((item) => (
          <div
            key={item.label}
            onClick={item.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: C.surfaceSubtle,
              border: `1px solid ${C.border}`,
              marginBottom: 8,
              cursor: item.onClick ? "pointer" : "default",
            }}
          >
            <item.icon size={14} color={C.textLight} />
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: item.onClick ? C.primary : C.text,
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}

        {conductorInfo.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: "12px 12px 8px",
              borderRadius: 12,
              background: "#F8FAFC",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontSize: 9,
                fontWeight: 800,
                color: C.textLight,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Información del solicitante
            </div>
            {conductorInfo.map((detail) => (
              <div
                key={detail.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "6px 0",
                  borderTop:
                    detail.label === "Tipo de usuario"
                      ? "1px solid #E2E8F0"
                      : "none",
                  color: C.text,
                  fontSize: 12,
                }}
              >
                <span style={{ color: C.textLight, fontWeight: 700 }}>
                  {detail.label}
                </span>
                <span style={{ textAlign: "right", fontWeight: 600 }}>
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {reserva.estado === "rechazada" && reserva.motivoRechazo && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: C.dangerBg,
              border: `1px solid ${C.dangerBorder}`,
            }}
          >
            <Ban size={14} color={C.danger} style={{ marginTop: 1 }} />
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: C.danger,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Motivo del rechazo
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {reserva.motivoRechazo}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
