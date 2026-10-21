// [turuta] Que macro es la de que propiedad (22/10). La pagina Propiedades
// guarda lo que manda la IA de una propiedad como macro para los asesores;
// aqui se ve desde Ajustes → Macros: en la lista, que macro es de una
// propiedad, y al editar una, el boton para pasar los cambios tambien a lo que
// manda la IA. Nuestra API (dashboard-app/properties/macros) dice los enlaces.
import { ref, computed } from 'vue';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { leadAppConfig } from './leadApp';

/** El enlace de una macro, o null si no es de ninguna propiedad. */
export const enlaceDeMacro = (enlaces, macroId) =>
  (enlaces || []).find(e => String(e.macroId) === String(macroId)) || null;

/** A donde lleva el enlace: la pagina Propiedades con esa propiedad abierta. */
export const rutaDeLaPropiedad = (enlace, accountId) => ({
  name: 'turuta_propiedades',
  params: { accountId },
  query: { propiedad: enlace.propertyId },
});

export function useMacrosDePropiedades() {
  const store = useStore();
  const apps = useMapGetter('dashboardApps/getRecords');
  const accountId = useMapGetter('getCurrentAccountId');
  const currentUser = useMapGetter('getCurrentUser');
  const config = computed(() => leadAppConfig(apps.value));
  const enlaces = ref([]);

  async function pedir(path, init = {}) {
    const cfg = config.value;
    if (!cfg) throw new Error('No se pudo leer la configuración del CRM.');
    const r = await fetch(cfg.api + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(cuerpo.message || 'No se pudo completar.');
    return cuerpo;
  }

  /** Lee los enlaces. Sin la API (o sin inventario) quedan vacios: nada se rompe. */
  async function cargarEnlaces() {
    if (!(apps.value || []).length) await store.dispatch('dashboardApps/get');
    try {
      const r = await pedir(
        `/dashboard-app/properties/macros?accountId=${accountId.value}`
      );
      enlaces.value = r.enlaces || [];
    } catch (e) {
      enlaces.value = [];
    }
  }

  /** Pasa la macro, tal como esta guardada, a lo que manda la IA de su propiedad. */
  const pasarALaPropiedad = (enlace, macroId) =>
    pedir('/dashboard-app/properties/macro/cargar', {
      method: 'POST',
      body: JSON.stringify({
        accountId: Number(accountId.value),
        site: enlace.site,
        propertyId: enlace.propertyId,
        macroId: Number(macroId),
        updatedBy: currentUser.value?.name || '',
      }),
    });

  return { enlaces, cargarEnlaces, pasarALaPropiedad, accountId };
}
