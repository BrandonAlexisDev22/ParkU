import type { Celda } from "@/services/api/celdas";
import { theme } from "@/styles/theme";
import { CELDA_ESTADO_CONFIG } from "../lib/constants";
import { SelectorBuscable } from "@/components/shared";
import { CeldaBadgeInline } from "./IncidenteBadges";

const C = theme;

interface IncidenteBasicFieldsProps {
  descripcion: string;
  celdaId: string;
  celdasDelParqueadero: Celda[];
  celdaSeleccionada: Celda | undefined;
  ocupanteSeleccionado: { vehiculo: { placa: string }; conductorNombre?: string } | null;
  descripcionError?: string;
  onDescripcionChange: (value: string) => void;
  onDescripcionBlur: () => void;
  onCeldaChange: (value: string) => void;
  ocupanteDeCelda: (celdaId?: string) => { vehiculo: { placa: string } } | null;
  permitirSinCelda?: boolean;
}

/** Campos descripción + parqueadero + celda del formulario de incidente. */
export function IncidenteBasicFields({
  descripcion, celdaId, celdasDelParqueadero,
  celdaSeleccionada, ocupanteSeleccionado, descripcionError,
  onDescripcionChange, onDescripcionBlur, onCeldaChange, ocupanteDeCelda,
  permitirSinCelda = true,
}: IncidenteBasicFieldsProps) {
  return (
    <>
      <div>
        <label htmlFor="descripcion" style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          Descripción *
        </label>
        <textarea
          id="descripcion"
          rows={3}
          placeholder="Describe el incidente o novedad..."
          value={descripcion}
          onChange={(e) => onDescripcionChange(e.target.value)}
          onBlur={onDescripcionBlur}
          aria-invalid={!!descripcionError}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 11,
            border: `1px solid ${descripcionError ? C.danger : C.border}`,
            fontSize: 13, outline: "none",
            fontFamily: "inherit", background: "#F8FAFC", resize: "none",
          }}
        />
        {descripcionError && (
          <p style={{ fontSize: 11, color: C.danger, marginTop: 6, fontWeight: 700 }}>{descripcionError}</p>
        )}
      </div>

      <div>
        <SelectorBuscable
          id="celda"
          label="Celda / vehículo estacionado"
          opciones={celdasDelParqueadero.map((c) => {
            const ocupante = ocupanteDeCelda(c.id);
            return {
              id: c.id,
              titulo: c.numero,
              subtitulo: `${CELDA_ESTADO_CONFIG[c.estado].label}${ocupante ? ` · ${ocupante.vehiculo.placa}` : ""}`,
            };
          })}
          valor={celdaId}
          onChange={onCeldaChange}
          deshabilitado={celdasDelParqueadero.length === 0}
          placeholder="Buscar por número de celda…"
          textoVacio="Ninguna celda coincide"
          textoSinSeleccion={permitirSinCelda ? "Sin celda específica" : undefined}
        />
      </div>

      {celdaId && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: -8 }}>
          <CeldaBadgeInline numero={celdaSeleccionada?.numero ?? ""} estado={celdaSeleccionada?.estado} />
          {ocupanteSeleccionado && (
            <span style={{ fontSize: 11, color: C.textLight }}>
              Ocupada por <strong>{ocupanteSeleccionado.vehiculo.placa}</strong>
              {ocupanteSeleccionado.conductorNombre ? ` — ${ocupanteSeleccionado.conductorNombre}` : ""}
            </span>
          )}
        </div>
      )}
    </>
  );
}
