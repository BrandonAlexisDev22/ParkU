import {
  IconCheck as Check,
  IconUser as User,
  IconMail as Mail,
  IconPhone as Phone,
  IconId as IdCard,
  IconBuilding as Building,
  IconCar as CarIcon,
  IconMapPin as MapPin,
  IconCalendar as Calendar,
} from "@tabler/icons-react";
import { theme } from "@/styles/theme";
import type { Reserva } from "@/services/api/reservas";
import type { Conductor } from "@/services/api/conductores";
import type { Vehiculo } from "@/services/api/vehiculos";
import type { Celda } from "@/services/api/celdas";
import type { Parqueadero } from "@/services/api/parqueaderos";

const C = theme;

interface ConfirmAceptarReservaModalProps {
  reserva: Reserva;
  usuario: Conductor | null | undefined;
  vehiculo: Vehiculo | undefined;
  celda: Celda | undefined;
  parqueadero: Parqueadero | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmAceptarReservaModal({
  reserva,
  usuario,
  vehiculo,
  celda,
  parqueadero,
  onCancel,
  onConfirm,
}: ConfirmAceptarReservaModalProps) {
  return (
    <div style={{ padding: "1.6rem" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(232,249,235,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={20} color={C.primary} />
        </div>
        <div>
          <h3
            style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: 0 }}
          >
            Confirmar aceptación
          </h3>
          <p style={{ fontSize: 12, color: C.textLight, marginTop: 6 }}>
            Vas a aceptar la solicitud de reserva. Revisa los datos del
            solicitante antes de confirmar. La información llegará al correo del
            usuario.
          </p>
        </div>
      </div>

      {usuario ? (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#F8FAFC",
            border: `1px solid ${C.border}`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <User size={16} color={C.primary} />
            <div style={{ fontWeight: 800, color: C.text }}>
              {usuario.nombre}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              color: C.textLight,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <IdCard size={14} color={C.primary} />
              {usuario.tipoDocumento || "—"} · {usuario.numeroDocumento || "—"}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Mail size={14} color={C.primary} />
              {usuario.correo || "Sin correo"}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Phone size={14} color={C.primary} />
              {usuario.numeroTelefonico || "Sin teléfono"}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Building size={14} color={C.primary} />
              {usuario.tipoUsuarioNombre || "Sin tipo"}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Building size={14} color={C.primary} />
              {usuario.centroFormacion || "Sin centro"}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12, color: C.textLight }}>
          Conductor sin datos
        </div>
      )}

      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: "#FFF",
          border: `1px solid ${C.border}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <CarIcon size={14} color={C.primary} />
          <div style={{ fontWeight: 800 }}>
            {vehiculo?.placa || "—"}{" "}
            <span style={{ fontWeight: 600, color: C.textLight }}>
              · {vehiculo?.marca || "—"} {vehiculo?.modelo || ""}
            </span>
          </div>
        </div>
        <div
          style={{ display: "flex", gap: 12, color: C.textLight, fontSize: 13 }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <MapPin size={14} color={C.primary} />
            {parqueadero?.nombre || "—"} · Celda {celda?.numero || "—"}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Calendar size={14} color={C.primary} />
            {reserva.fechaReserva} · {reserva.horaInicio}–{reserva.horaFin}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            color: C.text,
          }}
        >
          Volver
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            background: C.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Aceptar solicitud
        </button>
      </div>
    </div>
  );
}
