// [turuta] Estado de la ficha del lead para la conversacion abierta.
//
// Es UN estado para toda la pantalla: la cabecera fija (LeadHeader) y la
// seccion del acordeon (LeadDetails) leen el mismo lead y no lo piden dos
// veces. Por eso vive fuera de la funcion, a nivel de modulo.
//
// De donde salen los datos: de nuestra API (crm-inmobi), con el mismo endpoint
// que usaba el iframe. La direccion y el token se leen de la Dashboard App de
// la cuenta (ver leadApp.js). Quien pulsa el boton se manda como actor, para
// que el historial diga quien movio la etapa.
import { reactive, computed, watch, unref } from 'vue';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { leadAppConfig } from './leadApp';

const state = reactive({
  conversationId: null,
  lead: null, // respuesta de /dashboard-app/lead, o null
  loading: false,
  error: null, // 'config' | 'auth' | 'network' | null
  busy: false, // hay una accion en vuelo: los botones se apagan
  aviso: null, // error de la ultima accion, se borra solo
});

let avisoTimer = null;
let pedidas = false; // ya se pidieron las dashboard apps al store

function avisar(texto) {
  state.aviso = texto;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => {
    state.aviso = null;
  }, 6000);
}

class LeadApiError extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind;
  }
}

export function useLead(conversationId, contact) {
  const store = useStore();
  const apps = useMapGetter('dashboardApps/getRecords');
  const currentUser = useMapGetter('getCurrentUser');
  const config = computed(() => leadAppConfig(apps.value));

  async function request(path, init = {}) {
    const cfg = config.value;
    if (!cfg) throw new LeadApiError('config');
    const response = await fetch(cfg.api + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (response.status === 401) throw new LeadApiError('auth');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new LeadApiError(
        'api',
        body.message || 'No se pudo completar la accion'
      );
    }
    return body;
  }

  async function load(id = unref(conversationId)) {
    if (!id) return;
    state.conversationId = id;
    state.loading = true;
    try {
      const lead = await request(`/dashboard-app/lead?conversationId=${id}`);
      // Si mientras cargaba el asesor cambio de conversacion, esta respuesta
      // ya no es la suya.
      if (state.conversationId !== id) return;
      state.lead = lead;
      state.error = null;
    } catch (e) {
      if (state.conversationId !== id) return;
      state.lead = null;
      state.error = e instanceof LeadApiError ? e.kind : 'network';
    } finally {
      if (state.conversationId === id) state.loading = false;
    }
  }

  function actor() {
    const user = currentUser.value || {};
    return { actorAgentId: user.id, actorName: user.name };
  }

  // Un envio a la vez. Dos clics seguidos sobre la misma etapa mandarian dos
  // peticiones: la primera mueve el lead y la segunda vuelve rebotada con
  // "ya esta en esa etapa". Ver un error rojo tras una accion que SI funciono
  // es de lo mas desconcertante que puede pasar.
  async function act(path, body, method = 'PATCH') {
    if (state.busy || !state.lead?.found) return false;
    state.busy = true;
    try {
      await request(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      await load();
      return true;
    } catch (e) {
      avisar(
        e instanceof LeadApiError && e.kind === 'api'
          ? e.message
          : 'No se pudo completar la accion'
      );
      return false;
    } finally {
      state.busy = false;
    }
  }

  /** extra: { reason, reasonNote } cuando la etapa pide motivo. */
  const cambiarEtapa = (code, extra = {}) =>
    act(`/leads/${state.lead.id}/stage`, {
      toStageCode: code,
      ...extra,
      ...actor(),
    });

  const transferir = advisorId =>
    act(`/leads/${state.lead.id}/transfer`, { advisorId });

  /** Agendar o cambiar la visita vigente. `at` es ISO con zona horaria. */
  const agendarVisita = (at, address) =>
    act(
      `/leads/${state.lead.id}/visit`,
      { scheduledAt: at, address, ...actor() },
      'PUT'
    );

  const quitarVisita = () =>
    act(`/leads/${state.lead.id}/visit`, undefined, 'DELETE');

  // Las Dashboard Apps las carga ConversationBox al montarse; si entramos por
  // URL directa puede que aun no esten. Se piden una vez.
  if (!pedidas && !(apps.value || []).length) {
    pedidas = true;
    store.dispatch('dashboardApps/get');
  }

  watch(
    () => unref(conversationId),
    id => {
      if (id && id !== state.conversationId) load(id);
    },
    { immediate: true }
  );

  // La configuracion llega despues de la primera carga: reintentar.
  watch(config, (cfg, prev) => {
    if (cfg && !prev && state.error === 'config') load();
  });

  // Nuestra API escribe la etapa en el contacto de Chatwoot (crm_stage), y
  // Chatwoot actualiza el contacto por websocket. Asi el paso automatico a
  // "Contactado" al responder, o un cambio hecho por otro, se ve sin recargar.
  if (contact) {
    watch(
      () => unref(contact)?.custom_attributes?.crm_stage,
      (code, prev) => {
        if (!code || code === prev) return;
        if (state.lead?.found && state.lead.etapa?.code !== code) load();
      }
    );
  }

  // Dos cosas mas que cambian el lead sin pasar por la ficha, y llegan por
  // websocket a la conversacion: el asignado (transferir se hace con el
  // selector nativo) y los mensajes. Un mensaje nuevo puede ser el
  // recordatorio de visita que mando nuestra API, o el lead pulsando
  // "Confirmar". Nuestra API los procesa por webhook un instante despues, asi
  // que se espera un poco antes de recargar, y se vuelve a mirar por si el
  // webhook tardo mas. Solo dentro de la MISMA conversacion: al cambiar de
  // conversacion ya recarga el otro watcher.
  const currentChat = useMapGetter('getSelectedChat');
  const ultimoMensaje = () => {
    const mensajes = currentChat.value?.messages;
    return mensajes?.length ? mensajes[mensajes.length - 1].id : null;
  };
  watch(
    () => [
      currentChat.value?.id,
      currentChat.value?.meta?.assignee?.id,
      ultimoMensaje(),
    ],
    (
      [chatId, assignee, mensaje],
      [prevChatId, prevAssignee, prevMensaje] = []
    ) => {
      if (chatId !== prevChatId) return;
      if (assignee === prevAssignee && mensaje === prevMensaje) return;
      setTimeout(() => load(), 1500);
      setTimeout(() => load(), 6000);
    }
  );

  return {
    state,
    config,
    load,
    cambiarEtapa,
    transferir,
    agendarVisita,
    quitarVisita,
  };
}
