// [turuta] Capa de textos propia. es.json y en.json los genera generar.cjs (no
// editar a mano: lo escrito a mano va en manual.json y en nuevos.json).
import es from './es.json';
import en from './en.json';

const esObjeto = v => v && typeof v === 'object' && !Array.isArray(v);

/** Mezcla profunda: lo nuestro gana, lo demas de Chatwoot se conserva. */
export function mezclar(base, encima) {
  const out = { ...base };
  Object.keys(encima).forEach(k => {
    out[k] =
      esObjeto(base[k]) && esObjeto(encima[k])
        ? mezclar(base[k], encima[k])
        : encima[k];
  });
  return out;
}

// Dos funciones de UN argumento, y no una con el idioma de segundo: asi el
// formateador deja el objeto de Chatwoot con su sangria y el parche de cada
// index.js se queda en tres lineas.
export const conTextosTuruta = base => mezclar(base, es);

/** En ingles la capa solo trae las claves de funciones nuestras. */
export const conTextosTurutaEn = base => mezclar(base, en);
