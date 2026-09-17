// [turuta] Capa de textos propia. es.json lo genera generar.cjs (no editar a
// mano: los textos escritos a mano van en manual.json).
import textos from './es.json';

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

export const conTextosTuruta = base => mezclar(base, textos);
