// [turuta] Filtrar CHATS por atributos de CONTACTO. Chatwoot solo ofrece los de
// conversacion. La condicion viaja con la clave prefijada
// ("contact_attribute:distrito") y el servidor la traduce: ver
// app/services/turuta/contact_attribute_filters.rb.
//
// Este fichero no importa nada a proposito: lo usa tambien el almacen de
// conversaciones, que no debe arrastrar componentes.

export const PREFIJO_CONTACTO = 'contact_attribute:';

/** Grupo propio en el desplegable: "Atributos de contacto". */
export const GRUPO_CONTACTO = 'contactAttributes';

export const esClaveDeContacto = clave =>
  typeof clave === 'string' && clave.startsWith(PREFIJO_CONTACTO);

export const claveReal = clave => clave.slice(PREFIJO_CONTACTO.length);

/** Los filtros que construye Chatwoot para atributos de contacto, con la clave
 *  prefijada y en su grupo. attributeModel no se toca. */
export const comoFiltrosDeContacto = filtros =>
  (filtros || []).map(f => ({
    ...f,
    attributeKey: PREFIJO_CONTACTO + f.attributeKey,
    value: PREFIJO_CONTACTO + f.value,
    grupoVisual: GRUPO_CONTACTO,
  }));

/** Las definiciones tal como vienen del servidor (snake_case), con la clave
 *  prefijada: las necesita el dialogo de editar un filtro guardado para saber
 *  de que tipo es cada condicion. */
export const definicionesDeContacto = definiciones =>
  (definiciones || []).map(d => ({
    ...d,
    attribute_key: PREFIJO_CONTACTO + d.attribute_key,
  }));

/** El valor del atributo en el contacto del chat. Lo usa el navegador para
 *  decidir si un chat que llega o cambia sigue encajando en el filtro. */
export function valorDeContacto(conversation, clave) {
  const valor =
    conversation?.meta?.sender?.custom_attributes?.[claveReal(clave)];
  return valor === undefined || valor === '' ? null : valor;
}
