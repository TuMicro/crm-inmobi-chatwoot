// [turuta] Atributo personalizado de tipo lista con SELECCION MULTIPLE.
//
// En el servidor es el tipo `multi_list` (custom_attribute_definition.rb) y el
// valor se guarda como un array de textos dentro de custom_attributes:
//
//   { "distritos": ["Miraflores", "Surco"] }
//
// El filtro NO necesita SQL propio. Chatwoot, para "contiene", hace
//   LOWER(custom_attributes ->> 'distritos') ILIKE '%valor%'
// y `->>` sobre un array devuelve su JSON: ["Miraflores", "Surco"]. Si el valor
// que se manda lleva las comillas puestas ("Surco"), el patron solo encaja con
// el elemento entero: «Sur» no encuentra «Surco». De ahi idDeFiltro.

export const TIPO_MULTIPLE = 'multi_list';

/** El valor guardado, como lista de textos. Tolera lo que haya.
 *  Un texto suelto cuenta como una opcion: pasa si el atributo era de tipo
 *  lista normal y alguien cambio el tipo en la base. */
export function aLista(valor) {
  if (Array.isArray(valor))
    return valor.filter(v => v !== '' && v != null).map(String);
  if (typeof valor === 'string' && valor.trim()) return [valor];
  return [];
}

/** Marca o desmarca una opcion. El resultado sigue el orden de `opciones`, no
 *  el de los clics: asi dos contactos con lo mismo guardan lo mismo. */
export function alternar(elegidas, opcion, opciones = []) {
  const actual = aLista(elegidas);
  const siguiente = actual.includes(opcion)
    ? actual.filter(v => v !== opcion)
    : [...actual, opcion];
  const orden = v => {
    const i = opciones.indexOf(v);
    return i === -1 ? opciones.length : i;
  };
  return [...siguiente].sort((a, b) => orden(a) - orden(b));
}

/** Como viaja una opcion en un filtro: con sus comillas de JSON. */
export const idDeFiltro = opcion => JSON.stringify(String(opcion));

/** Opciones del filtro para un atributo; vacio si no es de seleccion multiple.
 *  Acepta la forma camelCase del filtro nuevo de Chatwoot. */
export function opcionesDeFiltro(atributo) {
  if (atributo?.attributeDisplayType !== TIPO_MULTIPLE) return [];
  return (atributo.attributeValues || []).map(opcion => ({
    id: idDeFiltro(opcion),
    name: opcion,
  }));
}

/** Lo que el filtro en vivo de la lista de chats compara con "contiene": el
 *  mismo JSON que ve el servidor. Lo que no es un array pasa tal cual. */
export const textoParaContiene = valor =>
  Array.isArray(valor) ? JSON.stringify(valor) : valor;

/** True si el valor de un filtro viene de idDeFiltro: va entre comillas. */
export const esIdDeFiltro = valor =>
  typeof valor === 'string' &&
  valor.length > 2 &&
  valor.startsWith('"') &&
  valor.endsWith('"');

/** "Contiene" para seleccion multiple: basta con que encaje UNA de las
 *  opciones del filtro, igual que el ILIKE ANY del servidor. */
export function contieneAlguna(valoresDelFiltro, valorGuardado) {
  const texto = textoParaContiene(valorGuardado);
  if (typeof texto !== 'string') return false;
  const enMinusculas = texto.toLowerCase();
  return valoresDelFiltro.some(v =>
    enMinusculas.includes(String(v).toLowerCase())
  );
}

const sinTildes = texto =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Las listas que llena la IA y amplia sola si hace falta (las crea nuestra
 *  API): "Distritos de interés" y "Tipo de propiedad". Se edita su lista,
 *  pero no se borran. La misma regla que definicionDeLista en la API
 *  (services/api/src/ai/listas.logic.ts). */
const LISTAS_DE_LA_IA = [
  {
    clave: 'distritos_de_interes',
    tipos: [TIPO_MULTIPLE],
    nombre: /distrito/,
    viejo: 'distritos_de_interes_ia',
  },
  {
    clave: 'tipo_de_propiedad',
    tipos: [TIPO_MULTIPLE, 'list'],
    nombre: /^tipos? de (propiedad|inmueble)/,
    viejo: 'tipo_de_propiedad_ia',
  },
];

export function esListaDeLaIa(atributo) {
  if (!atributo || atributo.attribute_model !== 'contact_attribute')
    return false;
  return LISTAS_DE_LA_IA.some(
    l =>
      atributo.attribute_key === l.clave ||
      (atributo.attribute_key !== l.viejo &&
        l.tipos.includes(atributo.attribute_display_type) &&
        l.nombre.test(sinTildes(atributo.attribute_display_name)))
  );
}
