import {
  IconArrowsLeftRight as ArrowLeftRight,
  IconCar as Car,
  IconLogin as LogIn,
  IconLogout as LogOutIcon,
  IconMapPin as MapPin,
  IconUser as User,
} from "@tabler/icons-react";
import { theme } from "@/styles/theme";
import type { ControlSalida } from "@/services/api/controlSalida";
import type { Vehiculo } from "@/services/api/vehiculos";
import type { Celda } from "@/services/api/celdas";
import type { Conductor } from "@/services/api/conductores";
import type { Parqueadero } from "@/services/api/parqueaderos";
import { ControlSalidaRow, controlSalidaGridColumns } from "./ControlSalidaRow";
import { ControlSalidaPagination } from "./ControlSalidaPagination";

const COLORS = theme;

interface ControlSalidaTableProps {
  paginatedControles: ControlSalida[];
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (updater: (page: number) => number) => void;
  getVehiculo: (id: string) => Vehiculo | undefined;
  getCelda: (id: string) => Celda | undefined;
  getUsuarioConductor: (vehiculoId: string) => Conductor | null | undefined;
  getParqueadero: (id: string) => Parqueadero | undefined;
  esConductor?: boolean;
  onVerDetalle: (control: ControlSalida) => void;
  onReportar?: (control: ControlSalida) => void;
  onLiberar?: (control: ControlSalida) => void;
}

/** Tabla del historial: encabezado, filas (o estado vacío) y paginación. */
export function ControlSalidaTable({
  paginatedControles,
  filteredCount,
  currentPage,
  totalPages,
  onPageChange,
  getVehiculo,
  getCelda,
  getUsuarioConductor,
  getParqueadero,
  esConductor = false,
  onVerDetalle,
  onReportar,
  onLiberar,
}: ControlSalidaTableProps) {
  const gridColumns = esConductor
    ? "minmax(155px,1fr) 85px minmax(135px,1fr) 150px 150px 90px 110px"
    : controlSalidaGridColumns;

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(15,23,42,.05)",
      }}
    >
      <div
        className="table-header"
        style={{ gridTemplateColumns: gridColumns }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Car size={12} /> Vehículo
        </div>
        {!esConductor && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <User size={12} /> Conductor
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MapPin size={12} /> Celda
        </div>
        <div>Parqueadero</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LogIn size={12} /> Entrada
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LogOutIcon size={12} /> Salida
        </div>
        <div>Estadía</div>
        <div style={{ textAlign: "right" }}>Acciones</div>
      </div>

      <div>
        {filteredCount === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "48px 24px",
              color: COLORS.textLight,
            }}
          >
            <ArrowLeftRight
              size={36}
              color={COLORS.border}
              style={{ marginBottom: 12 }}
            />
            <p style={{ fontWeight: 600, fontSize: 13 }}>
              No se encontraron registros
            </p>
            <p style={{ fontSize: 11, marginTop: 4 }}>
              Prueba con otros filtros. Las entradas se registran desde el
              módulo de Parqueaderos.
            </p>
          </div>
        ) : (
          paginatedControles.map((control) => {
            const celda = getCelda(control.celdaId);
            return (
              <ControlSalidaRow
                key={control.id}
                control={control}
                vehiculo={getVehiculo(control.vehiculoId)}
                celda={celda}
                usuario={getUsuarioConductor(control.vehiculoId)}
                parqueadero={celda ? getParqueadero(celda.parqueaderoId) : null}
                esConductor={esConductor}
                onVerDetalle={onVerDetalle}
                onReportar={onReportar}
                onLiberar={onLiberar}
              />
            );
          })
        )}
      </div>

      {filteredCount > 0 && (
        <ControlSalidaPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCount}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
