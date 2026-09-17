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
export const LEAD_SIDEBAR_ITEM = 'turuta_lead';

/** Titulo de esa seccion. Constante y no texto en la plantilla, para que el
 *  lint de Chatwoot no lo tome por una cadena sin traducir. */
export const LEAD_SIDEBAR_TITLE = 'Lead';

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

/** El orden guardado por cada asesor puede ser anterior a esta seccion: si
 *  falta, se pone la primera. Si ya esta, se respeta donde la dejo. */
export function withLeadItem(order) {
  const list = Array.isArray(order) ? [...order] : [];
  if (!list.some(item => item && item.name === LEAD_SIDEBAR_ITEM)) {
    list.unshift({ name: LEAD_SIDEBAR_ITEM });
  }
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
