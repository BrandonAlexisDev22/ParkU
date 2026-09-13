import React, { memo, useState } from "react";
import {
  IconCar as Car,
  IconAlertTriangle as AlertTriangle,
  IconChevronDown as ChevronDown,
  IconPencil as Pencil,
  IconMapPin as MapPin,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import type { Celda } from "@/services/api/celdas";
import type { Parqueadero } from "@/services/api/parqueaderos";
import { theme } from "@/styles/theme";
import {
  Ocupante,
  CELDA_CONFIG,
  TIPO_CELDA_CONFIG,
  getCeldaVisualConfig,
  esCeldaPreferencial,
  estaFueraDeHorarioOperacion,
  superaEstadiaLimite,
} from "../lib/helpers";

const C = theme;

/* ============================================================
   VISTA TABLA
============================================================ */
export const ParqueaderosTable = memo(
  ({
    parqueaderos,
    celdas,
    getOcupante,
    onEdit,
    onDelete,
    onToggleEstado,
    onReportar,
    onCellClick,
    cellMatchesSearch,
    celdaTieneIncidenteAbierto,
    canManage,
  }: {
    parqueaderos: Parqueadero[];
    celdas: Celda[];
    getOcupante: (celdaId: string) => Ocupante | null;
    onEdit: (p: Parqueadero) => void;
    onDelete: (p: Parqueadero) => void;
    /** Reportar un incidente o una novedad sobre este parqueadero, sin pasar por una celda:
     *  hay cosas que le pasan al parqueadero entero (el portón, la iluminación). */
    onReportar?: (p: Parqueadero) => void;
    onToggleEstado: (p: Parqueadero) => void;
    onCellClick: (c: Celda) => void;
    cellMatchesSearch: (c: Celda) => boolean;
    celdaTieneIncidenteAbierto: (c: Celda) => boolean;
    /** true si el rol puede editar/activar/desactivar parqueaderos (permiso "celdas"). */
    canManage: boolean;
  }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          background: "#fff",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(15,23,42,.05)",
        }}
      >
        <div className="pq-table-header">
          <div>Parqueadero</div>
          <div>Disponibles</div>
          <div>Ocupadas</div>
          <div>En mantenimiento</div>
          <div>Estado</div>
          <div style={{ textAlign: "right" }}>Acciones</div>
        </div>
        <div>
          {parqueaderos.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "48px 24px",
                color: C.textLight,
              }}
            >
              <Car size={36} color={C.border} style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 600, fontSize: 13 }}>
                No se encontraron parqueaderos
              </p>
            </div>
          ) : (
            parqueaderos.map((pq) => {
              const celdasPq = celdas.filter((c) => c.parqueaderoId === pq.id);
              const libres = celdasPq.filter(
                (c) => c.estado === "disponible",
              ).length;
              const ocupados = celdasPq.filter(
                (c) => c.estado === "no_disponible",
              ).length;
              const mantenimiento = celdasPq.filter(
                (c) => c.estado === "mantenimiento",
              ).length;
              const isExpanded = expandedId === pq.id;
              const activo = pq.estado === "activo";

              // Celdas de movilidad reducida de este parqueadero. Una celda MR es
              // `tipo: "carro"` + `usabilidad: "movilidad_reducida"` (ver helpers.ts), así que se
              // detecta con esCeldaPreferencial() y NO con `c.tipo === "movilidad reducida"`.
              // Este chip se dibuja al inicio de la fila, antes del icono y del nombre, porque es
              // la información cuya visibilidad urge al abrir la tabla.
              const celdasMR = celdasPq.filter(esCeldaPreferencial);
              const libresMR = celdasMR.filter(
                (c) => c.estado === "disponible",
              ).length;
              const cfgMR = TIPO_CELDA_CONFIG["movilidad reducida"];

              return (
                <React.Fragment key={pq.id}>
                  <div
                    className="pq-table-row"
                    style={{ background: isExpanded ? "#F8FAF8" : "#fff" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#F8FAF8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isExpanded
                        ? "#F8FAF8"
                        : "#fff")
                    }
                    onClick={() => setExpandedId(isExpanded ? null : pq.id)}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {/* Chip de movilidad reducida al inicio de la fila, con su icono indicativo.
                      Solo se pinta si el parqueadero tiene celdas preferenciales. */}
                      {celdasMR.length > 0 &&
                        (() => {
                          const IconMR = cfgMR.icon;
                          return (
                            <span
                              title={`Movilidad reducida: ${libresMR} libres de ${celdasMR.length}`}
                              aria-label={`Movilidad reducida: ${libresMR} libres de ${celdasMR.length}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 8px",
                                borderRadius: 999,
                                background: cfgMR.accentSoft,
                                color: cfgMR.accentDark,
                                border: `1px solid ${cfgMR.accent}`,
                                fontSize: 10,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              <IconMR size={12} strokeWidth={2.5} />
                              {libresMR}/{celdasMR.length}
                            </span>
                          );
                        })()}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: C.primaryPale,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <MapPin size={16} color={C.primary} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: C.text }}>
                          {pq.nombre}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: C.textLight,
                            marginBottom: 3,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>
                            {pq.zona || pq.ubicacion} · {celdasPq.length} celdas
                          </span>
                          {/* Que se pueda desplegar no se adivina: sin esta señal, las celdas de un
                          parqueadero quedaban escondidas detrás de un clic que nadie sabía dar. */}
                          <span style={{ color: C.primary, fontWeight: 700 }}>
                            · {isExpanded ? "ocultar celdas" : "ver celdas"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="pq-cell-label">Disponibles</span>
                      <span style={{ fontWeight: 700, color: C.primary }}>
                        {libres}
                      </span>
                    </div>
                    <div>
                      <span className="pq-cell-label">Ocupadas</span>
                      <span style={{ fontWeight: 700, color: C.danger }}>
                        {ocupados}
                      </span>
                    </div>
                    <div>
                      <span className="pq-cell-label">En mantenimiento</span>
                      <span style={{ fontWeight: 700, color: C.textLight }}>
                        {mantenimiento}
                      </span>
                    </div>
                    <div>
                      <span className="pq-cell-label">Estado</span>
                      {canManage ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEstado(pq);
                          }}
                          title={activo ? "Desactivar" : "Activar"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 9px",
                            borderRadius: 999,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            background: activo
                              ? "rgba(57,169,0,.1)"
                              : "rgba(239,68,68,.08)",
                            color: activo ? "#166534" : "#B91C1C",
                            fontFamily: "inherit",
                          }}
                          aria-label={
                            activo
                              ? "Desactivar parqueadero"
                              : "Activar parqueadero"
                          }
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: activo ? C.primary : "#EF4444",
                            }}
                          />
                          {pq.estado}
                        </button>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 9px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            background: activo
                              ? "rgba(57,169,0,.1)"
                              : "rgba(239,68,68,.08)",
                            color: activo ? "#166534" : "#B91C1C",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: activo ? C.primary : "#EF4444",
                            }}
                          />
                          {pq.estado}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 6,
                      }}
                    >
                      <button
                        title={isExpanded ? "Ocultar celdas" : "Ver celdas"}
                        aria-label={
                          isExpanded ? "Ocultar celdas" : "Ver celdas"
                        }
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : pq.id);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: "none",
                          background: "transparent",
                          color: C.textLight,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#F1F5F9")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {/* El galón gira al desplegar: es la convención de "aquí hay más". */}
                        <ChevronDown
                          size={15}
                          style={{
                            transition: "transform .18s ease",
                            transform: isExpanded ? "rotate(180deg)" : "none",
                          }}
                        />
                      </button>
                      {onReportar && (
                        <button
                          title="Reportar incidente o novedad"
                          aria-label={`Reportar incidente o novedad en ${pq.nombre}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReportar(pq);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "none",
                            background: "transparent",
                            color: C.warning,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#F1F5F9")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}
                      {canManage && (
                        <button
                          title="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(pq);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "none",
                            background: "transparent",
                            color: C.textLight,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#F1F5F9")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canManage && (
                        <button
                          title="Eliminar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(pq);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "none",
                            background: "transparent",
                            color: C.danger,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#FEF2F2")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderBottom: `1px solid ${C.border}`,
                        background: "#FAFBFC",
                      }}
                    >
                      {!activo && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            marginBottom: 12,
                            borderRadius: 10,
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: 0.4,
                            color: C.danger,
                            textTransform: "uppercase",
                          }}
                        >
                          ⚫ Parqueadero inactivo — no acepta reservas ni nuevos
                          ingresos. Puedes seguir editándolo y gestionando sus
                          celdas.
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          marginBottom: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {Object.entries(TIPO_CELDA_CONFIG).map(
                          ([tipo, cfg]) => {
                            let total = 0;
                            if (tipo === "movilidad reducida") {
                              total =
                                celdasPq.filter(esCeldaPreferencial).length;
                            } else if (tipo === "carro") {
                              // Excluir las plazas de movilidad reducida del conteo de "carro"
                              total = celdasPq.filter(
                                (c) =>
                                  c.tipo === tipo && !esCeldaPreferencial(c),
                              ).length;
                            } else {
                              total = celdasPq.filter(
                                (c) => c.tipo === tipo,
                              ).length;
                            }
                            if (!total) return null;
                            const Icon = cfg.icon;
                            return (
                              <div
                                key={tipo}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 6,
                                    background: cfg.accent,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Icon
                                    size={12}
                                    color="#fff"
                                    strokeWidth={2.5}
                                  />
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: C.text,
                                  }}
                                >
                                  {cfg.label}:{" "}
                                  <strong style={{ color: cfg.accentDark }}>
                                    {total}
                                  </strong>{" "}
                                  celdas
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(110px,1fr))",
                          gap: 8,
                        }}
                      >
                        {celdasPq.map((celda) => {
                          const cfg = CELDA_CONFIG[celda.estado];
                          const tipoCfg = getCeldaVisualConfig(celda);
                          const TipoIcon = tipoCfg.icon;
                          const matched = cellMatchesSearch(celda);
                          const ocupante =
                            celda.estado === "no_disponible"
                              ? getOcupante(celda.id)
                              : null;
                          const estaOcupada =
                            celda.estado === "no_disponible" &&
                            ocupante !== null;
                          const fueraDeHorario =
                            estaOcupada && estaFueraDeHorarioOperacion();
                          const estadiaLarga =
                            estaOcupada &&
                            !!ocupante &&
                            superaEstadiaLimite(
                              ocupante.fechaEntrada,
                              ocupante.esOficial,
                            );
                          const tieneIncidente =
                            celdaTieneIncidenteAbierto(celda);
                          return (
                            <button
                              key={celda.id}
                              onClick={() => onCellClick(celda)}
                              title={
                                fueraDeHorario
                                  ? "Sigue ocupada fuera del horario permitido — considera generar un incidente"
                                  : undefined
                              }
                              style={{
                                position: "relative",
                                padding: "8px 10px 8px 12px",
                                borderRadius: 10,
                                borderTop: `2px ${celda.estado === "disponible" ? "dashed" : "solid"} ${matched ? "#F59E0B" : fueraDeHorario ? "#DC2626" : cfg.border}`,
                                borderRight: `2px ${celda.estado === "disponible" ? "dashed" : "solid"} ${matched ? "#F59E0B" : fueraDeHorario ? "#DC2626" : cfg.border}`,
                                borderBottom: `2px ${celda.estado === "disponible" ? "dashed" : "solid"} ${matched ? "#F59E0B" : fueraDeHorario ? "#DC2626" : cfg.border}`,
                                borderLeft: `4px solid ${tipoCfg.accent}`,
                                background: fueraDeHorario ? "#FEF2F2" : cfg.bg,
                                color: cfg.text,
                                cursor: "pointer",
                                textAlign: "left",
                                fontFamily: "inherit",
                                outline: "none",
                                boxShadow: matched
                                  ? "0 0 0 3px rgba(245,158,11,.25)"
                                  : fueraDeHorario
                                    ? "0 0 0 3px rgba(220,38,38,.2)"
                                    : undefined,
                              }}
                            >
                              {tieneIncidente && (
                                <span
                                  title="Tiene un incidente abierto reportado"
                                  style={{
                                    position: "absolute",
                                    top: -6,
                                    left: -6,
                                    width: 17,
                                    height: 17,
                                    borderRadius: "50%",
                                    background: "#DC2626",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                      "0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,.25)",
                                    fontSize: 10,
                                    lineHeight: 1,
                                    zIndex: 1,
                                  }}
                                >
                                  ⚠️
                                </span>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: 4,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    letterSpacing: 1,
                                  }}
                                >
                                  {celda.numero}
                                </span>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 16,
                                    height: 16,
                                    borderRadius: 5,
                                    background: tipoCfg.accent,
                                    flexShrink: 0,
                                  }}
                                >
                                  <TipoIcon
                                    size={10}
                                    color="#fff"
                                    strokeWidth={2.5}
                                  />
                                </span>
                              </div>
                              {estaOcupada && ocupante && (
                                <div
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    background: "rgba(255,255,255,.15)",
                                    padding: "1px 4px",
                                    borderRadius: 4,
                                    marginBottom: 2,
                                  }}
                                >
                                  {ocupante.vehiculo.placa}
                                </div>
                              )}
                              {fueraDeHorario && (
                                <div
                                  style={{
                                    fontSize: 8,
                                    color: "#DC2626",
                                    fontWeight: 800,
                                    marginBottom: 2,
                                  }}
                                >
                                  ⏰ Fuera de horario
                                </div>
                              )}
                              {estadiaLarga && (
                                <div
                                  title="Lleva más de 16 horas estacionado — considera generar un incidente"
                                  style={{
                                    fontSize: 8,
                                    color: "#DC2626",
                                    fontWeight: 800,
                                    marginBottom: 2,
                                  }}
                                >
                                  ⚠️ +16h
                                </div>
                              )}
                              {celda.estado === "no_disponible" &&
                                !ocupante && (
                                  <div
                                    style={{
                                      fontSize: 8,
                                      color: C.danger,
                                      fontWeight: 700,
                                      marginBottom: 2,
                                    }}
                                  >
                                    ⚠️ Error
                                  </div>
                                )}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <span
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: cfg.dotColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 700,
                                    opacity: 0.8,
                                  }}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
        {parqueaderos.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: `1px solid ${C.border}`,
              background: "#F8FAF8",
              fontSize: 11,
              color: C.textLight,
            }}
          >
            Mostrando <strong>{parqueaderos.length}</strong> parqueadero
            {parqueaderos.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    );
  },
);
ParqueaderosTable.displayName = "ParqueaderosTable";
