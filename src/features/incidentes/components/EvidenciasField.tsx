import { useEffect, useRef, useState } from "react";

import {
  IconPhoto as Photo,
  IconPhotoOff as PhotoOff,
  IconTrash as Trash,
  IconUpload as Upload,
  IconX as X,
} from "@tabler/icons-react";

import { theme } from "@/styles/theme";

import {
  MAX_EVIDENCIAS,
  motivoArchivoInvalido,
  type Evidencia,
} from "@/services/api/evidencias";
import { EvidenciaImg } from "./EvidenciaImg";

const C = theme;

/**
 * Nombre visible:
 * descripción si existe, si no "Evidencia N".
 */
function nombreDe(ev: Evidencia, i: number): string {
  const descripcion = (ev.descripcion ?? "").trim();

  return descripcion || `Evidencia ${i + 1}`;
}

/* ============================================================
 * EVIDENCIAS FIELD
 * ============================================================
 */

export function EvidenciasField({
  archivos,
  onChange,
  existentes = [],
  soloLectura = false,
}: {
  archivos: File[];
  onChange: (archivos: File[]) => void;
  existentes?: Evidencia[];
  soloLectura?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);

  const total = archivos.length + existentes.length;

  const puedeAgregar =
    !soloLectura && total < MAX_EVIDENCIAS;

  /**
   * Maneja la selección de archivos.
   */
  const manejarArchivos = (fileList: FileList | null) => {
    if (!fileList || !fileList.length || soloLectura) {
      return;
    }

    const lista = Array.from(fileList);

    const validos: File[] = [];
    const errores: string[] = [];

    for (const archivo of lista) {
      const motivo = motivoArchivoInvalido(archivo);

      if (motivo) {
        errores.push(motivo);
        continue;
      }

      validos.push(archivo);
    }

    /**
     * Si no existe ningún archivo válido.
     */
    if (!validos.length) {
      setError(
        errores[0] ?? "Archivo no válido."
      );

      return;
    }

    /**
     * Cantidad de archivos que todavía podemos agregar.
     */
    const espaciosDisponibles = Math.max(
      MAX_EVIDENCIAS - total,
      0
    );

    if (espaciosDisponibles === 0) {
      setError(
        `Solo puedes agregar un máximo de ${MAX_EVIDENCIAS} imágenes.`
      );

      return;
    }

    /**
     * Limitamos los archivos al máximo permitido.
     */
    const aceptados = validos.slice(
      0,
      espaciosDisponibles
    );

    const rechazados =
      validos.length - aceptados.length;

    if (rechazados > 0) {
      setError(
        `Solo puedes agregar un máximo de ${MAX_EVIDENCIAS} imágenes.`
      );
    } else {
      setError(null);
    }

    if (aceptados.length === 0) {
      return;
    }

    /**
     * Actualizamos los archivos seleccionados.
     */
    onChange([
      ...archivos,
      ...aceptados,
    ]);

    /**
     * Permite volver a seleccionar el mismo archivo
     * posteriormente.
     */
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /**
   * Si el componente está en modo lectura,
   * mostramos únicamente las evidencias existentes.
   */
  if (soloLectura) {
    return (
      <EvidenciaGallery
        evidencias={existentes}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* ======================================================
          ENCABEZADO
          ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: C.text,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          <Photo size={14} />

          <span>
            Evidencias
          </span>
        </div>

        <span
          style={{
            fontSize: 11,
            color: C.textLight,
            fontWeight: 700,
          }}
        >
          {total} de {MAX_EVIDENCIAS}
        </span>
      </div>

      {/* ======================================================
          INPUT
          ====================================================== */}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Agregar evidencias"
        onChange={(event) =>
          manejarArchivos(event.target.files)
        }
        style={{
          display: "none",
        }}
      />

      {/* ======================================================
          BOTÓN AGREGAR
          ====================================================== */}

      {puedeAgregar && (
        <button
          type="button"
          onClick={() =>
            inputRef.current?.click()
          }
          style={{
            width: "fit-content",
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: C.surfaceSubtle,
            color: C.text,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Upload size={14} />

          Otra más
        </button>
      )}

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* ======================================================
          VISTA PREVIA TEMPORAL
          ====================================================== */}

      {archivos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 10,
            marginTop: 4,
          }}
        >
          {archivos.map(
            (archivo, index) => (
              <ArchivoPreview
                key={`${archivo.name}-${archivo.size}-${index}`}
                archivo={archivo}
                onRemove={() =>
                  onChange(
                    archivos.filter(
                      (_, i) => i !== index
                    )
                  )
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * PREVIEW TEMPORAL DE ARCHIVO
 * ============================================================
 */

function ArchivoPreview({
  archivo,
  onRemove,
}: {
  archivo: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  /**
   * Crea una URL temporal para visualizar
   * el archivo seleccionado.
   */
  useEffect(() => {
    const url =
      URL.createObjectURL(archivo);

    setPreviewUrl(url);

    /**
     * Liberamos la URL temporal cuando
     * el componente desaparece.
     */
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [archivo]);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        background: C.surfaceSubtle,
      }}
    >
      {/* ====================================================
          IMAGEN
          ==================================================== */}

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={archivo.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PhotoOff
            size={24}
            color={C.textLight}
          />
        </div>
      )}

      {/* ====================================================
          BOTÓN ELIMINAR
          ==================================================== */}

      <button
        type="button"
        aria-label={`Quitar ${archivo.name}`}
        onClick={onRemove}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "none",
          background:
            "rgba(0, 0, 0, 0.65)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trash size={13} />
      </button>

      {/* ====================================================
          NOMBRE DEL ARCHIVO
          ==================================================== */}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "5px 6px",
          background:
            "rgba(0, 0, 0, 0.65)",
          color: "#fff",
          fontSize: 10,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={archivo.name}
      >
        {archivo.name}
      </div>
    </div>
  );
}

/* ============================================================
 * EVIDENCIA THUMB
 * ============================================================
 */

function EvidenciaThumb({
  evidencia,
  indice,
  onPreview,
}: {
  evidencia: Evidencia;
  indice: number;
  onPreview: (url: string, nombre: string) => void;
}) {
  const urlOriginal = (evidencia.url ?? "").trim();
  const nombre = nombreDe(evidencia, indice);

  // `EvidenciaImg` prueba las URLs candidatas (origen del servidor y, si falla, base de la
  // API); aquí solo hace falta saber si alguna cargó, para abrir la vista ampliada con esa.
  const [cargada, setCargada] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setCargada(null);
    setFallo(false);
  }, [urlOriginal]);

  return (
    <button
      type="button"
      onClick={() => cargada && onPreview(cargada, nombre)}
      title={urlOriginal ? `URL: ${urlOriginal}` : "Sin URL en la respuesta"}
      aria-label={`Ver ${nombre}`}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        background: C.surfaceSubtle,
        padding: 0,
        cursor: cargada ? "zoom-in" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {urlOriginal && !fallo ? (
        <EvidenciaImg
          url={urlOriginal}
          alt={nombre}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onCargada={setCargada}
          onFallo={() => setFallo(true)}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: 10,
            color: C.textLight,
            fontSize: 10,
            textAlign: "center",
            lineHeight: 1.25,
          }}
        >
          <PhotoOff size={22} />
          <span style={{ wordBreak: "break-word", maxWidth: "100%" }}>
            {!urlOriginal ? "Sin URL" : "No se pudo cargar"}
          </span>
        </div>
      )}
    </button>
  );
}

/* ============================================================
 * GALERÍA DE EVIDENCIAS EXISTENTES
 * ============================================================
 */

export function EvidenciaGallery({
  evidencias,
}: {
  evidencias: Evidencia[];
}) {
  const [
    preview,
    setPreview,
  ] = useState<{
    url: string;
    nombre: string;
  } | null>(null);

  return (
    <>
      {/* ======================================================
          GALERÍA
          ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(104px, 1fr))",
          gap: 8,
        }}
      >
        {evidencias.map(
          (ev, i) => (
            <EvidenciaThumb
              key={ev.id ?? i}
              evidencia={ev}
              indice={i}
              onPreview={(
                url,
                nombre
              ) =>
                setPreview({
                  url,
                  nombre,
                })
              }
            />
          )
        )}
      </div>

      {/* ======================================================
          LIGHTBOX
          ====================================================== */}

      {preview && (
        <div
          onClick={() =>
            setPreview(null)
          }
          role="dialog"
          aria-label={preview.nombre}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(15,23,42,.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          {/* ==================================================
              IMAGEN GRANDE
              ================================================== */}

          <img
            src={preview.url}
            alt={preview.nombre}
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              borderRadius: 12,
              boxShadow:
                "0 24px 64px rgba(0,0,0,.55)",
              cursor: "default",
            }}
          />

          {/* ==================================================
              CERRAR
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              setPreview(null)
            }
            aria-label="Cerrar vista previa"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "rgba(255,255,255,.15)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

