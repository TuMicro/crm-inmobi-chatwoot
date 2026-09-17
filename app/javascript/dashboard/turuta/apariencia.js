// [turuta] Tema de la interfaz: claro, oscuro o el del sistema.
//
// Chatwoot lo cambia desde su paleta de comandos, que trae un buscador y una
// fila de atajos de teclado en ingles. Aqui esta lo mismo sin la paleta: se
// guarda en la MISMA clave del navegador y se aplica con la MISMA funcion, asi
// que las dos vias son intercambiables.
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { setColorTheme } from 'dashboard/helper/themeHelper.js';

export const TEMAS = ['light', 'dark', 'auto'];

/** El tema elegido. Sin elegir, el del sistema, como en Chatwoot. */
export function temaActual() {
  const guardado = LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME);
  return TEMAS.includes(guardado) ? guardado : 'auto';
}

export function ponerTema(tema) {
  if (!TEMAS.includes(tema)) return;
  LocalStorage.set(LOCAL_STORAGE_KEYS.COLOR_SCHEME, tema);
  const sistemaEnOscuro =
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  setColorTheme(sistemaEnOscuro);
}
