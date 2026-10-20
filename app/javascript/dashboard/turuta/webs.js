// [turuta] Con una marca generica (Flyboard, la de ensenar el CRM a otros
// clientes: docs/19 del repo crm-inmobi) no se ensena de que webs salen las
// propiedades: se llaman "Web 1", "Web 2"... Lo decide la marca del dominio
// por el que se entra, con TURUTA_OCULTAR_WEBS en window.globalConfig
// (app/services/turuta/marca_por_dominio.rb). Funciones puras: webs.spec.js.

export const ocultarWebs = (config = window.globalConfig) =>
  !!config?.TURUTA_OCULTAR_WEBS;

const ordenadas = sitios =>
  [...new Set((sitios || []).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

/**
 * Devuelve la funcion que nombra cada web: rotulo(site, nombreReal).
 *
 * Sin ocultar, el nombre real (o la clave del sitio). Ocultando, un numero:
 * primero las conectadas, en orden alfabetico, y despues las demas. Asi una
 * web lleva el mismo numero en Propiedades y en la pagina IA, que solo conoce
 * las conectadas.
 */
export function rotulosDeWebs(
  conectadas = [],
  otras = [],
  ocultar = ocultarWebs()
) {
  if (!ocultar) return (site, nombre) => nombre || site || '';
  const numeros = new Map();
  [...ordenadas(conectadas), ...ordenadas(otras)].forEach(site => {
    if (!numeros.has(site)) numeros.set(site, numeros.size + 1);
  });
  return site => (numeros.has(site) ? `Web ${numeros.get(site)}` : 'Web');
}
