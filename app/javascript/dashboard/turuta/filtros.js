// [turuta] Que filtros de chats se ofrecen y en que orden.
export const ETIQUETAS = 'labels';
const AGENTE = 'assignee_id';
export const ETAPA = 'crm_stage_name';

export const FILTROS_OCULTOS = new Set([
  'priority',
  'team_id',
  'campaign_id',
  'browser_language',
  'referer',
]);

const peso = filtro => {
  if (filtro.attributeKey === ETAPA) return 0;
  if (filtro.attributeKey === ETIQUETAS) return 1;
  return 2;
};

/** La etapa del lead primero y las etiquetas justo despues, en el grupo de los
 *  filtros estandar (grupoVisual) aunque por dentro siga siendo un atributo
 *  personalizado: attributeModel NO se toca, porque de el depende la
 *  consulta que se manda al servidor. "Agente asignado" solo para admins:
 *  el asesor ya tiene sus pestanas Mias / Sin asignar. */
export function ordenarFiltros(lista, { esAdmin }) {
  return lista
    .filter(f => !FILTROS_OCULTOS.has(f.attributeKey))
    .filter(f => esAdmin || f.attributeKey !== AGENTE)
    .map(f =>
      f.attributeKey === ETAPA ? { ...f, grupoVisual: 'standard' } : f
    )
    .map((f, i) => ({ f, i }))
    .sort((a, b) => peso(a.f) - peso(b.f) || a.i - b.i)
    .map(({ f }) => f);
}

/** Fila con la que se abre el dialogo de filtros: la etapa del lead, sin valor
 *  elegido. null si la cuenta no tiene ese atributo. Acepta las definiciones
 *  tal como vienen del servidor (snake_case) o las del filtro (camelCase). */
export function filaDeEtapa(definiciones) {
  const definicion = (definiciones || []).find(
    d => (d.attributeKey || d.attribute_key) === ETAPA
  );
  if (!definicion) return null;
  const tipo =
    definicion.attributeDisplayType || definicion.attribute_display_type;
  return {
    attributeKey: ETAPA,
    filterOperator: 'equal_to',
    // Un desplegable guarda un objeto; una caja de texto, un texto.
    values: tipo === 'list' ? {} : '',
    queryOperator: 'and',
  };
}

/** La etapa en la que se cierra la venta: la que se deja fuera al abrir. */
const CIERRE = 'cierre';

/**
 * La etapa del lead "no igual a Cierre". Sin una etapa que se llame Cierre en
 * la cuenta, la de filaDeEtapa, vacia. null si la cuenta no tiene el atributo.
 */
export function filaDeEtapaSinCierre(definiciones) {
  const fila = filaDeEtapa(definiciones);
  if (!fila) return null;
  const definicion = (definiciones || []).find(
    d => (d.attributeKey || d.attribute_key) === ETAPA
  );
  const valores =
    definicion.attributeValues || definicion.attribute_values || [];
  const cierre = valores.find(v => String(v).trim().toLowerCase() === CIERRE);
  if (!cierre) return fila;
  return {
    ...fila,
    filterOperator: 'not_equal_to',
    values:
      typeof fila.values === 'string' ? cierre : { id: cierre, name: cierre },
  };
}

/**
 * Las filas con las que se abre el dialogo de filtros (pedido el 20/10):
 * "Etiquetas", vacia, y "Etapa del lead no igual a Cierre". Las de contexto
 * de la vista (bandeja, equipo, la etiqueta de una vista de etiqueta) se
 * quedan detras; si una ya es de etiquetas o de etapa, va en su lugar.
 */
export function filasAlAbrir(contexto, definiciones) {
  const filas = contexto || [];
  const de = clave => filas.find(f => f.attributeKey === clave);
  const etiquetas = de(ETIQUETAS) || {
    attributeKey: ETIQUETAS,
    filterOperator: 'equal_to',
    values: [],
    queryOperator: 'and',
  };
  const etapa = de(ETAPA) || filaDeEtapaSinCierre(definiciones);
  const resto = filas.filter(
    f => f.attributeKey !== ETIQUETAS && f.attributeKey !== ETAPA
  );
  return [etiquetas, ...(etapa ? [etapa] : []), ...resto];
}
