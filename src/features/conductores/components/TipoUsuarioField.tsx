import { FormField } from "@/components/shared";
import { useTiposUsuario } from "../hooks/useTiposUsuario";
import { COLORS, inputStyle, inputErrorStyle } from "../lib/helpers";

interface TipoUsuarioFieldProps {
  value: string;
  error?: string;
  soloLectura?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/**
 * Tipo de usuario (Aprendiz, Instructor, Administrativo, Contratista, Visitante).
 *
 * Va al PRINCIPIO del formulario porque de él depende lo que viene después: todo conductor
 * necesita una cuenta de acceso, salvo el visitante. Con el campo al final había que rellenar
 * medio formulario para descubrir que la cuenta era obligatoria.
 */
export function TipoUsuarioField({ value, error, soloLectura = false, onChange, onBlur }: TipoUsuarioFieldProps) {
  const { data: tiposUsuario } = useTiposUsuario();
  const seleccionado = tiposUsuario.find((t) => t.id === value);
  const esVisitante = (seleccionado?.nombre || "").trim().toLowerCase() === "visitante";

  return (
    <section style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: COLORS.textLight, textTransform: "uppercase" }}>
          Tipo de usuario *
        </p>
      </div>
      <div style={{ padding: "0.85rem 1.1rem" }}>
        <FormField label="Tipo de usuario" error={error}>
          <select
            value={value}
            aria-label="Tipo de usuario"
            disabled={soloLectura}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            style={{
              ...inputStyle,
              ...(error ? inputErrorStyle : {}),
              appearance: "none",
              cursor: soloLectura ? "not-allowed" : "pointer",
              ...(soloLectura ? { background: COLORS.bg, color: COLORS.textLight } : {}),
            }}
          >
            <option value="">Seleccionar…</option>
            {tiposUsuario.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
            <option value="otro">Otro</option>
          </select>
        </FormField>
        <p style={{ marginTop: 8, fontSize: 11, color: COLORS.textLight, lineHeight: 1.5 }}>
          {esVisitante
            ? "Un visitante puede quedar sin cuenta de acceso: entra una vez y no necesita entrar al sistema."
            : "Salvo los visitantes, todo conductor necesita una cuenta de acceso: selecciónala abajo o créala con \"No tengo usuario\"."}
        </p>
      </div>
    </section>
  );
}
