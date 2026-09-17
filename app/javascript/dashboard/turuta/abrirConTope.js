// [turuta] Abrir la base de datos del navegador (IndexedDB) con un tope de tiempo.
//
// Chatwoot guarda ahi bandejas, etiquetas, equipos y respuestas predefinidas, y
// las lee de ahi en vez de pedirlas al servidor. Al cerrar sesion BORRA esa base.
// Si hay otra pestana del CRM abierta, el borrado se queda bloqueado por ella, y
// todo intento posterior de abrir la base se pone a la cola detras del borrado:
// la promesa no se resuelve NUNCA y no da ningun error. Consecuencias que se
// vieron en staging: la lista de bandejas no llega, asi que el cuadro de
// respuesta se queda sin adjuntar, audio ni plantillas, y la pagina de
// plantillas se queda en "Cargando..." para siempre.
//
// Con el tope, si la base no abre a tiempo se lanza un error y
// CacheEnabledApiClient ya sabe que hacer con el: pedir los datos al servidor.

export const TOPE_MS = 3000;

export function abrirConTope(abriendo, ms = TOPE_MS) {
  let caducado = false;
  let reloj;
  const tope = new Promise((_, reject) => {
    reloj = setTimeout(() => {
      caducado = true;
      reject(new Error('La base de datos del navegador no responde'));
    }, ms);
  });

  // Si acaba abriendo tarde, esa conexion ya no la usa nadie: se cierra, para
  // que no sea ella la que bloquee a la siguiente.
  abriendo
    .then(db => {
      if (caducado) db?.close?.();
    })
    .catch(() => {});

  return Promise.race([abriendo, tope]).finally(() => clearTimeout(reloj));
}
