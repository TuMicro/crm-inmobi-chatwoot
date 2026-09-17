// [turuta] Funciones puras de la ficha del lead. Sin Vue ni store, para que
// se puedan probar solas (leadApp.spec.js).
//
// La configuracion del panel (donde esta nuestra API y con que token se
// entra) NO va en la imagen: la misma imagen sirve a local, staging y
// produccion. Sale de la Dashboard App "Ficha del lead" que onboard-tenant.sh
// registra en cada cuenta. Chatwoot ya la descarga al abrir una conversacion;
// nosotros solo leemos su URL. Ver docs/10-plan-fork-ui.md en crm-inmobi.

export const LEAD_APP_PATH = '/dashboard-app';

/** Nombre de nuestra seccion en el acordeon del panel de contacto. */
export const LEAD_SIDEBAR_ITEM = 'turuta_historial';

/** Titulo de esa seccion. Constante y no texto en la plantilla, para que el
 *  lint de Chatwoot no lo tome por una cadena sin traducir. */
export const LEAD_SIDEBAR_TITLE = 'Historial del lead';

/** La seccion "Lead" de 4.17.1-3, que ya no existe. Si quedo guardada en el
 *  orden de algun asesor, se quita. */
const LEAD_SIDEBAR_ITEM_ANTIGUO = 'turuta_lead';

/** El orden de fabrica de Chatwoot (useUISettings). Se compara contra el, no se
 *  importa, para que este fichero siga sin depender del store. Si ellos lo
 *  cambian, la comparacion falla y solo se anade el historial al final. */
const ORDEN_CHATWOOT = [
  'conversation_actions',
  'macros',
  'conversation_info',
  'contact_attributes',
  'contact_notes',
  'shared_files',
  'previous_conversation',
  'conversation_participants',
  'linear_issues',
  'shopify_orders',
];

/** Nuestro orden, pensado para un asesor inmobiliario en WhatsApp: primero
 *  lo que toca cada dia (asignar, etiquetas), luego lo que consulta sobre la
 *  persona (notas, conversaciones anteriores, fotos y documentos), y al final
 *  lo que casi nunca mira. El historial del lead, el ultimo. */
export const ORDEN_TURUTA = [
  'conversation_actions',
  'contact_notes',
  'previous_conversation',
  'shared_files',
  'macros',
  'contact_attributes',
  'conversation_info',
  'conversation_participants',
  'linear_issues',
  'shopify_orders',
  LEAD_SIDEBAR_ITEM,
];

/** True si esta Dashboard App es la nuestra: se reconoce por la ruta, no por
 *  el titulo, porque el titulo lo puede cambiar un administrador. */
export function isLeadApp(app) {
  const url = app?.content?.[0]?.url;
  if (!url) return false;
  try {
    return new URL(url).pathname.replace(/\/+$/, '') === LEAD_APP_PATH;
  } catch (e) {
    return false;
  }
}

/** Origen de la API y token, sacados de la URL de la Dashboard App. */
export function leadAppConfig(apps) {
  const app = (apps || []).find(isLeadApp);
  if (!app) return null;
  const url = new URL(app.content[0].url);
  return { api: url.origin, token: url.searchParams.get('token') || '' };
}

/** Orden de las secciones del panel para este asesor.
 *
 *  Si nunca ha reordenado nada (el orden es el de fabrica de Chatwoot), se le
 *  da el nuestro. Si ya lo movio, se respeta: solo se quita la seccion antigua
 *  y se anade el historial al final si falta. */
export function withLeadItems(order) {
  const list = (Array.isArray(order) ? order : []).filter(
    item => item && item.name && item.name !== LEAD_SIDEBAR_ITEM_ANTIGUO
  );
  const nombres = list.map(item => item.name);
  const deFabrica =
    nombres.length === ORDEN_CHATWOOT.length &&
    nombres.every((name, i) => name === ORDEN_CHATWOOT[i]);
  if (deFabrica) return ORDEN_TURUTA.map(name => ({ name }));
  if (!nombres.includes(LEAD_SIDEBAR_ITEM))
    list.push({ name: LEAD_SIDEBAR_ITEM });
  return list;
}

/** Dia y hora, corto. Con varios movimientos la misma tarde, solo "hoy" no
 *  decia cual fue antes. */
export function cuando(iso, now = Date.now()) {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  const hora = f.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dias = Math.floor((now - f.getTime()) / 86400000);
  if (dias <= 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  if (dias < 30) return `hace ${dias} dias, ${hora}`;
  return `${f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} ${hora}`;
}

/** Mensaje de error que se ensena al asesor segun lo que fallo. */
export function textoError(kind) {
  if (kind === 'config') {
    return 'La ficha del lead no esta configurada en esta cuenta.';
  }
  if (kind === 'auth') {
    return 'No se pudo autenticar contra el CRM. La Dashboard App de esta cuenta debe llevar el token.';
  }
  return 'No se pudo cargar la ficha del lead.';
}
