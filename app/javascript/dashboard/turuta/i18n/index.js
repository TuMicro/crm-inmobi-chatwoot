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

/** "Chatwoot" y "Woot" sueltos pasan a ser la marca de la instalacion.
 *
 *  Chatwoot ya lo hace con replaceInstallationName, pero solo en los textos
 *  que alguien se acordo de pasar por ahi: quedan decenas que no ("No se pudo
 *  conectar al servidor Woot"). Aqui se hace con todos, una vez, al cargar el
 *  idioma. Distingue mayusculas: "chatwoot.com" dentro de una URL no se toca. */
export function conMarca(textos, marca) {
  if (!marca || marca === 'Chatwoot') return textos;
  // Caracteres con significado para vue-i18n: fuera de la marca.
  const limpia = marca.replace(/[{}@|]/g, '').trim();
  if (!limpia) return textos;
  const cambiar = valor => {
    if (typeof valor === 'string') {
      return valor.includes('oot')
        ? valor.replace(/\bChatwoot\b/g, limpia).replace(/\bWoot\b/g, limpia)
        : valor;
    }
    if (Array.isArray(valor)) return valor.map(cambiar);
    if (esObjeto(valor)) {
      return Object.fromEntries(
        Object.entries(valor).map(([k, v]) => [k, cambiar(v)])
      );
    }
    return valor;
  };
  return cambiar(textos);
}

// La marca la deja el layout en window.globalConfig antes de cargar ningun
// script (app/views/layouts/vueapp.html.erb, con las variables TURUTA_*).
const marcaDeLaInstalacion = () =>
  (typeof window !== 'undefined' &&
    (window.globalConfig?.BRAND_NAME ||
      window.globalConfig?.INSTALLATION_NAME)) ||
  '';

// Dos funciones de UN argumento, y no una con el idioma de segundo: asi el
// formateador deja el objeto de Chatwoot con su sangria y el parche de cada
// index.js se queda en tres lineas.
export const conTextosTuruta = base =>
  conMarca(mezclar(base, es), marcaDeLaInstalacion());

/** En ingles la capa solo trae las claves de funciones nuestras. */
export const conTextosTurutaEn = base =>
  conMarca(mezclar(base, en), marcaDeLaInstalacion());
