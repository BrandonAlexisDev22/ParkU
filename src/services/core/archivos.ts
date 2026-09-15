/**
 * URLs de archivos que devuelve la API (evidencias de incidentes, etc.).
 *
 * `VITE_API_URL` apunta a la base de la API, CON prefijo (`https://host/api`). Los
 * archivos estáticos, en cambio, los sirve el servidor desde su raíz (`https://host/uploads/…`):
 * anteponer la base de la API a una ruta relativa daba `https://host/api/uploads/…`, que
 * cae en el manejador JSON de "Ruta no encontrada" — por eso las evidencias no cargaban.
 *
 * Como no hay forma de confirmar desde el front bajo qué prefijo monta el backend sus
 * estáticos, `candidatosUrlArchivo` devuelve las URLs a probar en orden: primero desde el
 * origen (lo habitual con `express.static`), después bajo la base de la API. Quien pinte la
 * imagen prueba la siguiente si la anterior falla (ver EvidenciaImg.tsx).
 */

const esAbsoluta = (url: string) => /^(https?:|data:|blob:)/i.test(url);

/** `https://host` a partir de `https://host/api`; cadena vacía si la base es relativa (proxy). */
function origenDe(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
}

const unir = (base: string, ruta: string) => {
  const b = base.replace(/\/+$/, '');
  return ruta.startsWith('/') ? `${b}${ruta}` : `${b}/${ruta}`;
};

/** Resolutor para una base de API concreta (la real se inyecta abajo; los tests pasan la suya). */
export function crearResolutorDeArchivos(baseApi: string) {
  const origen = origenDe(baseApi);

  /** URLs a intentar, en orden, para mostrar un archivo devuelto por la API. */
  const candidatosUrlArchivo = (url: string | null | undefined): string[] => {
    const limpia = (url ?? '').trim();
    if (!limpia) return [];
    if (esAbsoluta(limpia)) return [limpia];

    const candidatos = [unir(origen, limpia)];
    const bajoApi = unir(baseApi, limpia);
    if (bajoApi !== candidatos[0]) candidatos.push(bajoApi);
    return candidatos;
  };

  /** La URL más probable de un archivo (primer candidato), o cadena vacía. */
  const resolverUrlArchivo = (url: string | null | undefined): string => candidatosUrlArchivo(url)[0] ?? '';

  return { candidatosUrlArchivo, resolverUrlArchivo };
}

const BASE_API: string = (import.meta as any).env?.VITE_API_URL ?? '';

export const { candidatosUrlArchivo, resolverUrlArchivo } = crearResolutorDeArchivos(BASE_API);
