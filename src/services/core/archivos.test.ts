import { describe, it, expect } from 'vitest';
import { crearResolutorDeArchivos } from './archivos';

const BASE_REAL = 'https://api-parku-e017.onrender.com/api';

describe('services/core/archivos', () => {
  it('resuelve una ruta relativa contra el ORIGEN del servidor, no contra la base /api', () => {
    const { candidatosUrlArchivo, resolverUrlArchivo } = crearResolutorDeArchivos(BASE_REAL);

    expect(resolverUrlArchivo('/uploads/evidencias/foto.jpg')).toBe(
      'https://api-parku-e017.onrender.com/uploads/evidencias/foto.jpg'
    );
    // Y deja la base de la API como segundo intento, por si el backend sirviera bajo /api.
    expect(candidatosUrlArchivo('uploads/evidencias/foto.jpg')).toEqual([
      'https://api-parku-e017.onrender.com/uploads/evidencias/foto.jpg',
      'https://api-parku-e017.onrender.com/api/uploads/evidencias/foto.jpg',
    ]);
  });

  it('deja intactas las URLs absolutas, data: y blob:', () => {
    const { candidatosUrlArchivo } = crearResolutorDeArchivos(BASE_REAL);

    expect(candidatosUrlArchivo('https://cdn.ejemplo.com/a.png')).toEqual(['https://cdn.ejemplo.com/a.png']);
    expect(candidatosUrlArchivo('blob:http://localhost/123')).toEqual(['blob:http://localhost/123']);
    expect(candidatosUrlArchivo('data:image/png;base64,AAA')).toEqual(['data:image/png;base64,AAA']);
  });

  it('con una base relativa (proxy /api) usa el mismo origen de la página', () => {
    const { candidatosUrlArchivo } = crearResolutorDeArchivos('/api');

    expect(candidatosUrlArchivo('/uploads/x.jpg')).toEqual(['/uploads/x.jpg', '/api/uploads/x.jpg']);
  });

  it('tolera una base con barra final y devuelve vacío sin URL', () => {
    const { candidatosUrlArchivo, resolverUrlArchivo } = crearResolutorDeArchivos(`${BASE_REAL}/`);

    expect(resolverUrlArchivo('/uploads/x.jpg')).toBe('https://api-parku-e017.onrender.com/uploads/x.jpg');
    expect(candidatosUrlArchivo('')).toEqual([]);
    expect(candidatosUrlArchivo(undefined)).toEqual([]);
    expect(resolverUrlArchivo(null)).toBe('');
  });
});
