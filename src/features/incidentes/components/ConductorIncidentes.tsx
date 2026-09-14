import {
  IconAlertTriangle as AlertTriangle,
  IconPlus as Plus,
  IconShieldExclamation as ShieldAlert,
} from "@tabler/icons-react";
import { Modal } from "@/components/shared";
import { theme } from "@/styles/theme";
import { useConductorIncidentesData } from "../hooks/useConductorIncidentesData";
import { useIncidenteDialogs } from "../hooks/useIncidenteDialogs";
import { IncidenteFormModal } from "./IncidenteFormModal";
import { ConductorIncidenteCard } from "./ConductorIncidenteCard";

const C = theme;

/**
 * "Mis incidentes" para el rol Comunidad SENA — mismo patrón que
 * `ConductorDashboard.tsx`: una vista propia, más simple, en vez del panel
 * completo de gestión que usan Admin/Vigilante. Cubre 07.1.11 (reportar) a
 * 07.1.14 (cancelar); ver el porqué del alcance en
 * `useConductorIncidentesData.ts`.
 */
export function ConductorIncidentes() {
  const data = useConductorIncidentesData();
  const dialogs = useIncidenteDialogs(data);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          borderRadius: 20, background: "linear-gradient(135deg,#39A900,#2D7D00)",
          padding: "1.4rem 1.6rem", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Mis incidentes</h1>
            <p style={{ fontSize: 12, color: "#fff", margin: "2px 0 0" }}>
              {data.misIncidentes.length} reportado{data.misIncidentes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={dialogs.openCreate}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12,
            border: "none", background: "#fff", color: C.primaryDark, fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Plus size={15} />Reportar incidente
        </button>
      </div>

      {data.misIncidentes.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "3rem 1rem", borderRadius: 16, border: `2px dashed ${C.border}`,
          background: "#fff", color: C.textLight,
        }}>
          <AlertTriangle size={36} color={C.border} style={{ marginBottom: 10 }} />
          {data.isError ? (
            // La consulta de "mis incidentes" falló (típicamente un 403: la API real hoy solo
            // le da a este rol "reportar" y el historial, no el listado — ver
            // useConductorIncidentesData.ts). Sin este mensaje, esta pantalla vacía es
            // indistinguible de "no he reportado nada" y el conductor podría creer, erróneamente,
            // que su reporte se perdió.
            <>
              <p style={{ fontWeight: 700, fontSize: 13 }}>No pudimos cargar tu historial de incidentes</p>
              <p style={{ fontSize: 11, marginTop: 4, textAlign: "center", maxWidth: 320 }}>
                Si ya reportaste uno, se guardó correctamente: esta consulta todavía no está disponible para tu rol. Intenta de nuevo más tarde.
              </p>
            </>
          ) : (
            <p style={{ fontWeight: 700, fontSize: 13 }}>Todavía no has reportado ningún incidente</p>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
          {data.misIncidentes.map((incidente) => (
            <ConductorIncidenteCard
              key={incidente.id}
              incidente={incidente}
              celda={data.celdaDe(incidente.celdaId)}
              nombreParqueadero={data.nombreParqueadero(incidente.parqueaderoId)}
              onEdit={() => dialogs.openEdit(incidente)}
              onCancelar={() => data.cancelarIncidente(incidente.id)}
            />
          ))}
        </div>
      )}

      <Modal open={dialogs.dialogOpen} onClose={dialogs.closeForm} maxWidth={640}>
        <IncidenteFormModal
          isEditing={dialogs.isEditing}
          usuariosReportantes={data.usuariosReportantes}
          puedeRegistrarNovedades={false}
          evidencias={dialogs.evidencias}
          onEvidenciasChange={dialogs.setEvidencias}
          evidenciasExistentes={dialogs.evidenciasExistentes}
          showJustificacionCierre={false}
          formData={dialogs.formData}
          setFormData={dialogs.setFormData}
          formTouched={dialogs.formTouched}
          formErrors={dialogs.formErrors}
          formInvalido={dialogs.formInvalido}
          markTouched={dialogs.markTouched}
          parqueaderos={data.parqueaderos}
          vehiculos={data.misVehiculos}
          usuarios={[]}
          puedeClasificar={false}
          celdasDelParqueadero={dialogs.celdasDelParqueadero}
          celdaSeleccionada={data.celdaDe(dialogs.formData.celdaId)}
          ocupanteSeleccionado={dialogs.ocupanteSeleccionado}
          ocupanteDeCelda={data.ocupanteDeCelda}
          onParqueaderoChange={dialogs.handleParqueaderoChange}
          onCeldaChange={dialogs.handleCeldaChange}
          onClose={dialogs.closeForm}
          onSave={dialogs.handleSave}
        />
      </Modal>
    </div>
  );
}
