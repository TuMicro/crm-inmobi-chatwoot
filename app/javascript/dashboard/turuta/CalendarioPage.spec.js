import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import CalendarioPage from './CalendarioPage.vue';

const query = ref({});
const replace = vi.fn();
const alerta = vi.fn();
const rol = ref('agent');

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
      getCurrentRole: rol,
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
    rol.value = 'agent';
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

  it('la copia de todas las visitas solo la ve un administrador', async () => {
    api({ ...BASE, copia: ['jefe@x.com'] });
    const asesor = await montar();
    expect(asesor.text()).not.toContain('Copia de todas las visitas');

    rol.value = 'administrator';
    const admin = await montar();
    expect(admin.text()).toContain('Copia de todas las visitas');
    expect(admin.find('input').element.value).toBe('jefe@x.com');
  });

  it('guardar la copia manda los correos limpios', async () => {
    rol.value = 'administrator';
    const llamada = api({ ...BASE, copia: [] });
    const w = await montar();
    await w.find('input').setValue('Jefe@X.com, otra@y.pe');
    llamada.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ copia: ['jefe@x.com', 'otra@y.pe'] }),
    }));
    await w.find('form').trigger('submit');
    await flushPromises();
    const [url, init] = llamada.mock.calls.at(-1);
    expect(url).toBe('https://api.crm.x/dashboard-app/calendar/copy');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({
      accountId: 1,
      correos: ['jefe@x.com', 'otra@y.pe'],
    });
    expect(alerta).toHaveBeenCalledWith(
      'Guardado: jefe@x.com, otra@y.pe recibirá todas las visitas.'
    );
  });

  it('un correo mal escrito en la copia se dice y no deja guardar', async () => {
    rol.value = 'administrator';
    api({ ...BASE, copia: [] });
    const w = await montar();
    await w.find('input').setValue('jefe@x.com, pepe');
    expect(w.text()).toContain('No parece un correo: pepe');
    const guardar = w.findAll('button').find(b => b.text().includes('Guardar'));
    expect(guardar.attributes('disabled')).toBeDefined();
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
