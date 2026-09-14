import { Modal, LoadingState } from "@/components/shared";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";
import { useIncidentesPage } from "./hooks/useIncidentesPage";
import { incidentesStyles } from "./lib/styles";
import { IncidentesHero } from "./components/IncidentesHero";
import { IncidentesToolbar } from "./components/IncidentesToolbar";
import { IncidentesGrid } from "./components/IncidentesGrid";
import { IncidenteFormModal } from "./components/IncidenteFormModal";
import { IncidenteViewModal } from "./components/IncidenteViewModal";
import { ConfirmDeleteIncidenteModal } from "./components/ConfirmDeleteIncidenteModal";
import { CambioEstadoIncidenteModal } from "./components/CambioEstadoIncidenteModal";
import { esEstadoFinal } from "./lib/transiciones";
import { ConductorIncidentes } from "./components/ConductorIncidentes";

const C = theme;

export function Incidentes() {
  const { user } = useAuth();
  const p = useIncidentesPage();

  // El rol Comunidad SENA (Conductor) no ve el panel completo del parqueadero, sino su
  // propio historial de incidentes y la opción de reportar uno asociado a sus vehículos.
  if (user?.rol === ROLES.CONDUCTOR) {
    return <ConductorIncidentes />;
  }

  return (
    <>
      <style>{incidentesStyles}</style>

      <div
        className="incidentes-root"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <IncidentesHero
          pendientes={p.pendientes}
          enProceso={p.enProceso}
          resueltos={p.resueltos}
          total={p.incidentes.length}
        />

        <IncidentesToolbar
          search={p.search}
          onSearchChange={p.setSearch}
          filterEstado={p.filterEstado}
          onFilterEstadoChange={p.setFilterEstado}
          filterClase={p.filterClase}
          onFilterClaseChange={p.setFilterClase}
          activeFiltersCount={p.activeFiltersCount}
          onClearFilters={p.clearFilters}
          onCreate={p.openCreate}
        />

        {p.isLoading ? (
          <LoadingState message="Cargando incidentes..." />
        ) : (
          <>
            {p.activeFiltersCount > 0 && (
              <p style={{ fontSize: 11, color: C.textLight }}>
                Mostrando <strong>{p.filteredIncidentes.length}</strong>{" "}
                incidente{p.filteredIncidentes.length !== 1 ? "s" : ""}
              </p>
            )}

            <IncidentesGrid
              incidentes={p.filteredIncidentes}
              celdaDe={p.celdaDe}
              vehiculoDe={p.vehiculoDe}
              nombreUsuarioAsignado={p.nombreUsuarioAsignado}
              nombreUsuarioReporta={p.nombreUsuarioReporta}
              conductorDe={p.conductorDe}
              nombreParqueadero={p.nombreParqueadero}
              onView={p.openView}
              onEdit={p.openEdit}
              onDelete={p.handleDelete}
              onCambiarEstado={p.solicitarCambioEstado}
            />
          </>
        )}
      </div>

      <Modal open={p.dialogOpen} onClose={p.closeForm} maxWidth={640}>
        <IncidenteFormModal
          isEditing={p.isEditing}
          usuariosReportantes={p.usuariosReportantes}
          puedeRegistrarNovedades={p.puedeRegistrarNovedades}
          evidencias={p.evidencias}
          onEvidenciasChange={p.setEvidencias}
          evidenciasExistentes={p.evidenciasExistentes}
          /* El motivo/justificación acompaña a un desenlace: resuelto (cómo se resolvió) o
             rechazado/cancelado (por qué no procedía). Antes solo salía en "resuelto", así que
             un reporte descartado no tenía dónde guardar la explicación al editarlo. */
          showJustificacionCierre={
            p.isEditing &&
            !!p.selectedIncidente &&
            esEstadoFinal(p.selectedIncidente.estado)
          }
          formData={p.formData}
          setFormData={p.setFormData}
          formTouched={p.formTouched}
          formErrors={p.formErrors}
          formInvalido={p.formInvalido}
          markTouched={p.markTouched}
          parqueaderos={p.parqueaderos}
          vehiculos={p.vehiculos}
          usuarios={p.usuariosAsignables}
          celdasDelParqueadero={p.celdasDelParqueadero}
          celdaSeleccionada={p.celdaDe(p.formData.celdaId)}
          ocupanteSeleccionado={p.ocupanteSeleccionado}
          ocupanteDeCelda={p.ocupanteDeCelda}
          onParqueaderoChange={p.handleParqueaderoChange}
          onCeldaChange={p.handleCeldaChange}
          onClose={p.closeForm}
          onSave={p.handleSave}
        />
      </Modal>

      <Modal
        open={p.viewOpen}
        onClose={() => p.setViewOpen(false)}
        maxWidth={480}
      >
        {p.selectedIncidente && (
          <IncidenteViewModal
            incidente={p.selectedIncidente}
            celda={p.celdaDe(p.selectedIncidente.celdaId)}
            vehiculoPlaca={p.vehiculoDe(p.selectedIncidente.vehiculoId)?.placa}
            conductorNombre={
              p.conductorDe(p.selectedIncidente.vehiculoId)?.nombre
            }
            conductorDocumento={
              p.conductorDe(p.selectedIncidente.vehiculoId)?.numeroDocumento
            }
            asignadoNombre={p.nombreUsuarioAsignado(
              p.selectedIncidente.usuarioAsignadoId,
            )}
            reportanteNombre={p.nombreUsuarioReporta(
              p.selectedIncidente.usuarioReportaId,
            )}
            reportanteCorreo={p.correoUsuario(
              p.selectedIncidente.usuarioReportaId,
            )}
            asignadoCorreo={p.correoUsuario(
              p.selectedIncidente.usuarioAsignadoId,
            )}
            puedeAbrirPerfiles={p.puedeAbrirPerfiles}
            evidencias={p.evidenciasExistentes}
            nombreParqueadero={p.nombreParqueadero(
              p.selectedIncidente.parqueaderoId,
            )}
            onClose={() => p.setViewOpen(false)}
            onEdit={() => p.openEdit(p.selectedIncidente!)}
          />
        )}
      </Modal>

      {/* Antes de mover un incidente de estado se pide lo que ese estado exige: un encargado
          para avanzar, un motivo para descartarlo. */}
      <Modal
        open={!!p.cambioEstado}
        onClose={p.cerrarCambioEstado}
        maxWidth={440}
      >
        {p.cambioEstado && (
          <CambioEstadoIncidenteModal
            destino={p.cambioEstado.destino}
            descripcion={p.cambioEstado.incidente.descripcion}
            usuariosAsignables={p.usuariosAsignables}
            onCancel={p.cerrarCambioEstado}
            onConfirm={p.confirmarCambioEstado}
          />
        )}
      </Modal>

      <Modal
        open={!!p.confirmDelete}
        onClose={() => p.setConfirmDelete(null)}
        maxWidth={380}
      >
        {p.confirmDelete && (
          <ConfirmDeleteIncidenteModal
            descripcion={p.confirmDelete.descripcion}
            onCancel={() => p.setConfirmDelete(null)}
            onConfirm={p.confirmDeleteAction}
          />
        )}
      </Modal>
    </>
  );
}
