import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import es from './es.json';
import en from './en.json';

// vue-i18n reserva caracteres: "@" enlaza otro mensaje, "|" separa plurales y
// "{" abre una variable. Un texto nuestro con una "@" suelta no da error al
// construir la imagen ni en desarrollo: lo da en PRODUCCION y al pintarlo, y
// el componente que lo usa desaparece entero de la pantalla. Paso con los
// requisitos de la contrasena ("como ! @ # $"). Por eso aqui se pinta cada
// texto de la capa con el mismo motor que la interfaz y en modo produccion,
// que es el unico en el que vue-i18n lanza el error en vez de avisarlo.
const rutas = (obj, prefijo = '') =>
  Object.entries(obj).flatMap(([k, v]) => {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    return v && typeof v === 'object' ? rutas(v, ruta) : [ruta];
  });

let createI18n;
const entorno = process.env.NODE_ENV;

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  ({ createI18n } = await import('vue-i18n'));
});
afterAll(() => {
  process.env.NODE_ENV = entorno;
});

const pintarTodo = (idioma, mensajes) => {
  const i18n = createI18n({
    legacy: false,
    locale: idioma,
    messages: { [idioma]: mensajes },
    missingWarn: false,
    fallbackWarn: false,
  });
  const rotos = [];
  rutas(mensajes).forEach(ruta => {
    try {
      i18n.global.t(ruta, { count: 2, n: 2, min: 6 }, 2);
    } catch (e) {
      rotos.push(ruta);
    }
  });
  return rotos;
};

describe('los textos de la capa se pueden pintar en produccion', () => {
  it('la prueba detecta una arroba suelta', () => {
    expect(pintarTodo('es', { A: 'como ! @ #', B: 'bien' })).toEqual(['A']);
  });

  it('espanol', () => {
    expect(pintarTodo('es', es)).toEqual([]);
  });

  it('ingles', () => {
    expect(pintarTodo('en', en)).toEqual([]);
  });
});
