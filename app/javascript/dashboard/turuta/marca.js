// [turuta] La marca tiene dos iconos: uno para fondo claro (LOGO_THUMBNAIL, que
// ya existia en Chatwoot) y otro para fondo oscuro, que Chatwoot no tiene. El
// segundo llega en window.globalConfig desde la variable de entorno
// TURUTA_LOGO_THUMBNAIL_DARK (ver app/views/layouts/vueapp.html.erb).
// Sin esa variable no hay icono oscuro y todo queda como en Chatwoot.

export const iconoParaFondoOscuro = (config = window.globalConfig) =>
  config?.LOGO_THUMBNAIL_DARK || '';
