import type { Vehiculo } from "@/services/api/vehiculos";
import type { Usuario } from "@/services/api/usuarios";
import type { TipoNovedad, PrioridadNovedad } from "@/services/api/incidentes";
import { theme } from "@/styles/theme";
import { SelectorBuscable } from "@/components/shared";
import { TIPO_NOVEDAD_LABEL, PRIORIDAD_LABEL, opcionesDeVehiculo } from "../lib/constants";

const C = theme;
const selectStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 11,
  border: `1px solid ${C.border}`, fontSize: 13, outline: "none",
  fontFamily: "inherit", background: "#F8FAFC",
} as const;

interface IncidenteVehiculoAsignadoFieldsProps {
  vehiculoId: string;
  vehiculoError?: string;
  usuarioAsignadoId: string;
  tipoNovedad: TipoNovedad;
  /** En qué consiste, cuando el tipo es "otro": guardarlo sin poder escribirlo lo volvía inútil. */
  tipoOtro: string;
  onTipoOtroChange: (value: string) => void;
  prioridad: PrioridadNovedad;
  vehiculos: Vehiculo[];
  /** Solo tiene datos si el usuario actual es Admin (único rol que puede listar /api/usuarios). */
  usuarios: Usuario[];
  /** false para quien solo REPORTA (Comunidad SENA): esa persona describe lo que vio, no decide
   *  la urgencia ni a qué vigilante se le asigna — eso lo define quien recibe el reporte al
   *  aceptarlo. Con false, ni la prioridad ni "Asignar a" se muestran. */
  puedeClasificar?: boolean;
  showJustificacionCierre: boolean;
  justificacionCierre: string;
  onVehiculoChange: (value: string) => void;
  onUsuarioAsignadoChange: (value: string) => void;
  onTipoNovedadChange: (value: TipoNovedad) => void;
  onPrioridadChange: (value: PrioridadNovedad) => void;
  onJustificacionCierreChange: (value: string) => void;
}

/** Campos tipo/prioridad, vehículo, asignar a (solo Admin), y justificación de cierre. */
export function IncidenteVehiculoAsignadoFields({
  vehiculoId, vehiculoError, usuarioAsignadoId, tipoNovedad, tipoOtro, onTipoOtroChange, prioridad, vehiculos, usuarios, puedeClasificar = true,
  showJustificacionCierre, justificacionCierre,
  onVehiculoChange, onUsuarioAsignadoChange, onTipoNovedadChange, onPrioridadChange, onJustificacionCierreChange,
}: IncidenteVehiculoAsignadoFieldsProps) {
  return (
    <>
      <div className="incidentes-form-grid" style={{ display: "grid", gridTemplateColumns: puedeClasificar ? "1fr 1fr" : "1fr", gap: 12 }}>
        <div>
          <label htmlFor="tipoNovedad" style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            Tipo *
          </label>
          <select id="tipoNovedad" value={tipoNovedad} onChange={(e) => onTipoNovedadChange(e.target.value as TipoNovedad)} style={selectStyle}>
            <option value="">Selecciona el tipo…</option>
            {(Object.keys(TIPO_NOVEDAD_LABEL) as TipoNovedad[]).map((t) => (
              <option key={t} value={t}>{TIPO_NOVEDAD_LABEL[t]}</option>
            ))}
          </select>
          {/* "Otro" sin decir qué es no clasifica nada. */}
          {tipoNovedad === "otro" && (
            <input
              id="tipoOtro"
              aria-label="¿De qué tipo se trata?"
              value={tipoOtro}
              onChange={(e) => onTipoOtroChange(e.target.value)}
              maxLength={100}
              placeholder="¿De qué tipo se trata?"
              style={{ ...selectStyle, background: "#fff", marginTop: 8 }}
            />
          )}
        </div>
        {puedeClasificar && (
          <div>
            <label htmlFor="prioridad" style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              Prioridad
            </label>
            <select id="prioridad" value={prioridad} onChange={(e) => onPrioridadChange(e.target.value as PrioridadNovedad)} style={selectStyle}>
              {(Object.keys(PRIORIDAD_LABEL) as PrioridadNovedad[]).map((p) => (
                <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Buscable: la flota entera en un desplegable obligaba a recorrer cientos de placas. */}
      <SelectorBuscable
        id="vehiculo"
        label="Vehículo estacionado *"
        opciones={opcionesDeVehiculo(vehiculos)}
        valor={vehiculoId}
        onChange={onVehiculoChange}
        // La flota entera abierta de golpe no ayuda a nadie: aquí se espera a que se escriba.
        sugerirAlDesplegar={false}
        placeholder="Escribe la placa o el nombre del dueño…"
        textoVacio="Ningún vehículo coincide"
        textoSinSeleccion="Ninguno"
        error={vehiculoError}
        ayuda="El parqueadero y la celda se toman automáticamente de su ubicación actual."
      />

      {!puedeClasificar && (
        <p style={{ fontSize: 10, color: C.textLight }}>
          Tu reporte queda <strong>pendiente</strong>: quien lo reciba define la prioridad y a qué vigilante se asigna.
        </p>
      )}

      {puedeClasificar && (
      <div>
        <SelectorBuscable
          id="asignadoA"
          label="Encargado"
          opciones={usuarios.map((u) => ({ id: u.id, titulo: u.nombre, subtitulo: u.correo }))}
          valor={usuarioAsignadoId}
          onChange={onUsuarioAsignadoChange}
          placeholder="Buscar por nombre o correo…"
          textoVacio="No hay nadie disponible para asignar"
          textoSinSeleccion="Sin asignar"
          ayuda="Se recomienda, no es obligatorio: es a quien se le pregunta después."
        />
      </div>
      )}

      {showJustificacionCierre && (
        <div>
          <label htmlFor="justificacionCierre" style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            Justificación de cierre
          </label>
          <textarea
            id="justificacionCierre"
            rows={2}
            placeholder="¿Qué se hizo para resolver el incidente?"
            value={justificacionCierre}
            onChange={(e) => onJustificacionCierreChange(e.target.value)}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 11,
              border: `1px solid ${C.border}`, fontSize: 13, outline: "none",
              fontFamily: "inherit", background: "#F8FAFC", resize: "none",
            }}
          />
        </div>
      )}
    </>
  );
}
