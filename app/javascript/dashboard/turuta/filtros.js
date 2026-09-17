// [turuta] Que filtros de chats se ofrecen y en que orden.
const ETIQUETAS = 'labels';
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

/** Pone la fila de la etapa delante, salvo que ya haya una. */
export function conEtapaPrimero(filas, definiciones) {
  if ((filas || []).some(f => f.attributeKey === ETAPA)) return filas;
  const fila = filaDeEtapa(definiciones);
  return fila ? [fila, ...(filas || [])] : filas;
}
