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
  if (filtro.attributeKey === ETIQUETAS) return 0;
  if (filtro.attributeKey === ETAPA) return 1;
  return 2;
};

/** Etiquetas primero y la etapa del lead justo despues, en el grupo de los
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
