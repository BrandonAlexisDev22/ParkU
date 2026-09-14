import { LoadingState, Modal } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";
import { useControlSalidaPage } from "./hooks/useControlSalidaPage";
import { controlSalidaStyles } from "./lib/styles";
import { ControlSalidaHero } from "./components/ControlSalidaHero";
import { ControlSalidaToolbar } from "./components/ControlSalidaToolbar";
import { ControlSalidaTable } from "./components/ControlSalidaTable";
import { ControlSalidaDetalleModal } from "./components/ControlSalidaDetalleModal";
import { IncidenteModal } from "@/features/parqueaderos";

export function ControlSalidaPage() {
  const p = useControlSalidaPage();
  const { user } = useAuth();

  return (
    <>
      <style>{controlSalidaStyles}</style>

      <div
        className="control-root"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <ControlSalidaHero
          enParqueadero={p.vehiculosEnParqueadero.length}
          salidas={p.vehiculosSalidos.length}
          celdasLibres={p.celdasDisponibles.length}
          total={p.controlesSalida.length}
        />

        <ControlSalidaToolbar
          search={p.search}
          onSearchChange={p.setSearch}
          filterEstado={p.filterEstado}
          onFilterEstadoChange={p.setFilterEstado}
          filterParqueadero={p.filterParqueadero}
          onFilterParqueaderoChange={p.setFilterParqueadero}
          parqueaderos={p.parqueaderos}
          filteredCount={p.filteredControles.length}
          hasActiveFilters={p.hasActiveFilters}
          onClearFilters={p.clearFilters}
        />

        {p.isLoading ? (
          <LoadingState message="Cargando registros..." />
        ) : (
          <ControlSalidaTable
            paginatedControles={p.paginatedControles}
            filteredCount={p.filteredControles.length}
            currentPage={p.currentPage}
            totalPages={p.totalPages}
            onPageChange={p.setPage}
            getVehiculo={p.getVehiculo}
            getCelda={p.getCelda}
            getUsuarioConductor={p.getUsuarioConductor}
            getParqueadero={p.getParqueadero}
            esConductor={user?.rol === ROLES.CONDUCTOR}
            onVerDetalle={p.verDetalle}
            onReportar={
              user?.rol !== ROLES.CONDUCTOR ? p.abrirReporteDe : undefined
            }
            onLiberar={
              user?.rol === ROLES.CONDUCTOR ? undefined : p.handleLiberar
            }
          />
        )}
      </div>

      {/* La ficha completa del movimiento: lo que no cabe en la fila. */}
      <Modal open={!!p.detalle} onClose={p.cerrarDetalle} maxWidth={460}>
        {p.detalle && (
          <ControlSalidaDetalleModal
            control={p.detalle}
            vehiculo={p.getVehiculo(p.detalle.vehiculoId)}
            celda={p.getCelda(p.detalle.celdaId)}
            conductor={p.getUsuarioConductor(p.detalle.vehiculoId)}
            parqueadero={p.getParqueadero(p.detalle.parqueaderoId)}
            onClose={p.cerrarDetalle}
          />
        )}
      </Modal>

      {/* Reportar sobre un movimiento: el formulario ya llega con su celda, su parqueadero y
          su vehículo, que es lo que costaba volver a buscar. */}
      <IncidenteModal
        open={p.reporteAbierto}
        celdaActiva={null}
        ocupanteActivo={null}
        parqueaderoActivo={null}
        incidenteForm={p.reporte.incidenteForm}
        setIncidenteForm={p.reporte.setIncidenteForm}
        incidenteError={p.reporte.incidenteError}
        usuariosAsignables={[]}
        usuariosReportantes={p.usuariosReportantes}
        puedeRegistrarNovedades={p.reporte.puedeRegistrarNovedades}
        vehiculosDelReportante={p.reporte.vehiculosDelReportante}
        vehiculoFijado={!!p.reporte.objetivo?.vehiculoId}
        evidencias={p.reporte.evidencias}
        onEvidenciasChange={p.reporte.setEvidencias}
        etiquetaContexto={p.reporte.objetivo?.etiqueta}
        onClose={p.reporte.closeIncidenteModal}
        onSubmit={p.reporte.registrarIncidente}
      />
    </>
  );
}
