import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { useLead } from './useLead';

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: vi.fn() }),
  useMapGetter: nombre =>
    ({
      'dashboardApps/getRecords': ref([
        {
          content: [{ url: 'https://api.crm.x/dashboard-app?token=T' }],
        },
      ]),
      getCurrentUser: ref({ id: 7, name: 'Ana' }),
      getSelectedChat: ref(null),
    })[nombre],
}));

const conCalendario = estado => ({
  found: true,
  id: 'L1',
  visita: { id: 'v1', calendario: { estado, de: 'Ana', error: null } },
});

/** La API responde, una tras otra, las fichas de la lista; despues, la ultima. */
function api(respuestas) {
  let i = 0;
  const llamada = vi.fn(async () => {
    const r = respuestas[Math.min(i, respuestas.length - 1)];
    i += 1;
    return { ok: true, status: 200, json: async () => r };
  });
  vi.stubGlobal('fetch', llamada);
  return llamada;
}

let lead;
const montar = conversationId =>
  mount(
    defineComponent({
      setup() {
        lead = useLead(ref(conversationId));
        return () => h('div');
      },
    })
  );

describe('useLead: la visita subiendo a Google Calendar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mientras dice "poniendola", vuelve a mirar cada 2 s hasta que esta', async () => {
    const llamada = api([
      conCalendario('pendiente'),
      conCalendario('pendiente'),
      conCalendario('ok'),
    ]);
    montar(101);
    await vi.advanceTimersByTimeAsync(0);
    expect(lead.state.lead.visita.calendario.estado).toBe('pendiente');
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(lead.state.lead.visita.calendario.estado).toBe('ok');
    expect(llamada).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10000);
    expect(llamada).toHaveBeenCalledTimes(3);
  });

  it('si no termina, deja de mirar al medio minuto', async () => {
    const llamada = api([conCalendario('pendiente')]);
    montar(102);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60000);
    expect(llamada).toHaveBeenCalledTimes(16);
  });

  it('una ficha sin nada pendiente no se vuelve a pedir', async () => {
    const llamada = api([conCalendario('ok')]);
    montar(103);
    await vi.advanceTimersByTimeAsync(10000);
    expect(llamada).toHaveBeenCalledTimes(1);
  });
});
