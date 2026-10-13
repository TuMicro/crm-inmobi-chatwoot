import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import CalendarioPage from './CalendarioPage.vue';

const query = ref({});
const replace = vi.fn();
const alerta = vi.fn();

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
    })[nombre],
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 }, query: query.value }),
  useRouter: () => ({ replace }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => alerta(...args),
}));
// La cabecera de Chatwoot arrastra el router entero; aqui no pinta nada.
vi.mock(
  'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue',
  () => ({ default: { render: () => null } })
);

const BASE = {
  configurado: true,
  conectado: false,
  correo: null,
  calendario: 'Visitas · MadHouse',
  roto: false,
  error: null,
};

/** La API responde `estado` al preguntar y lo que toque al conectar. */
function api(estado) {
  const fetchFalso = vi.fn(async (url, init = {}) => ({
    ok: true,
    json: async () =>
      init.method === 'POST'
        ? { url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' }
        : estado,
  }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

const montar = async () => {
  const w = mount(CalendarioPage, {
    global: { stubs: { Icon: true } },
  });
  await flushPromises();
  return w;
};

describe('CalendarioPage', () => {
  beforeEach(() => {
    query.value = {};
    replace.mockClear();
    alerta.mockClear();
  });

  it('pregunta por el calendario de quien mira, no por el de la cuenta', async () => {
    const llamada = api(BASE);
    await montar();
    expect(llamada).toHaveBeenCalledWith(
      'https://api.crm.x/dashboard-app/calendar?accountId=1&userId=7',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer T' }),
      })
    );
  });

  it('sin conectar: el boton lleva a la pantalla de Google', async () => {
    const llamada = api(BASE);
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const w = await montar();
    expect(w.text()).toContain('Conecta tu cuenta de Google');
    await w.find('button').trigger('click');
    await flushPromises();
    const [, init] = llamada.mock.calls.at(-1);
    expect(JSON.parse(init.body)).toEqual({
      accountId: 1,
      userId: 7,
      userName: 'Ana',
    });
    expect(assign).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?x=1'
    );
  });

  it('conectado: dice con que cuenta y en que calendario', async () => {
    api({ ...BASE, conectado: true, correo: 'ana@gmail.com' });
    const w = await montar();
    expect(w.text()).toContain('Conectado con ana@gmail.com');
    expect(w.text()).toContain('«Visitas · MadHouse»');
    expect(w.text()).toContain('Desconectar');
    expect(w.text()).not.toContain('Volver a conectar');
  });

  it('la conexion caida se dice, con el boton para volver a conectar', async () => {
    api({ ...BASE, conectado: true, correo: 'ana@gmail.com', roto: true });
    const w = await montar();
    expect(w.text()).toContain('Google dejó de aceptar la conexión');
    expect(w.text()).toContain('Volver a conectar');
  });

  it('sin configurar en el servidor: no ofrece conectar', async () => {
    api({ ...BASE, configurado: false });
    const w = await montar();
    expect(w.text()).toContain('Todavía no está disponible');
    expect(w.text()).not.toContain('Conectar con Google');
    expect(w.text()).not.toContain('Cómo funciona');
  });

  it('al volver de Google avisa y limpia la direccion', async () => {
    api({ ...BASE, conectado: true, correo: 'ana@gmail.com' });
    query.value = { calendario: 'conectado' };
    await montar();
    expect(alerta).toHaveBeenCalledWith(
      'Listo: tu Google Calendar quedó conectado.'
    );
    expect(replace).toHaveBeenCalledWith({ query: {} });
  });
});
