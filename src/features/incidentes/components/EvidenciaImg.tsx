import { useEffect, useState, type CSSProperties } from "react";
import { candidatosUrlArchivo } from "@/services/core/archivos";

interface EvidenciaImgProps {
  /** URL tal como la devuelve la API (relativa o absoluta). */
  url: string;
  alt: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
  /** Se llama con la URL que sí cargó, para reutilizarla (p. ej. en la vista ampliada). */
  onCargada?: (src: string) => void;
  /** Se llama cuando ninguna de las URLs candidatas cargó. */
  onFallo?: () => void;
}

/**
 * Imagen de evidencia que prueba, en orden, las URLs candidatas de `candidatosUrlArchivo`
 * (origen del servidor y, si falla, base de la API). Así la foto se ve sin importar bajo qué
 * prefijo monte el backend sus archivos estáticos, y sin adivinarlo en cada componente.
 */
export function EvidenciaImg({ url, alt, style, loading, onClick, onCargada, onFallo }: EvidenciaImgProps) {
  const candidatos = candidatosUrlArchivo(url);
  const [indice, setIndice] = useState(0);

  // Si cambia la URL de origen, se vuelve a empezar por el primer candidato.
  useEffect(() => setIndice(0), [url]);

  const src = candidatos[indice];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      loading={loading}
      onClick={onClick}
      onLoad={() => onCargada?.(src)}
      onError={() => {
        if (indice + 1 < candidatos.length) setIndice(indice + 1);
        else onFallo?.();
      }}
    />
  );
}
