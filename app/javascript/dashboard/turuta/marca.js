// [turuta] La marca tiene dos iconos: uno para fondo claro (LOGO_THUMBNAIL, que
// ya existia en Chatwoot) y otro para fondo oscuro, que Chatwoot no tiene. El
// segundo llega en window.globalConfig desde la variable de entorno
// TURUTA_LOGO_THUMBNAIL_DARK (ver app/views/layouts/vueapp.html.erb).
// Sin esa variable no hay icono oscuro y todo queda como en Chatwoot.

export const iconoParaFondoOscuro = (config = window.globalConfig) =>
  config?.LOGO_THUMBNAIL_DARK || '';

// [turuta] Arriba del menu, junto al icono, Chatwoot pone el nombre de la
// cuenta. Con la marca de otro dominio (Flyboard: docs/19 del repo crm-inmobi)
// va el de la marca: la cuenta es la misma en los dos dominios. Vacio: el de
// la cuenta, como en Chatwoot. Lo pone app/services/turuta/marca_por_dominio.rb.
export const nombreEnElMenu = (config = window.globalConfig) =>
  config?.TURUTA_NOMBRE_EN_MENU || '';
