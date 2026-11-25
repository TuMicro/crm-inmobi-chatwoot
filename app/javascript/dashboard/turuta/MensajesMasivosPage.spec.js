import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import MensajesMasivosPage from './MensajesMasivosPage.vue';

const alerta = vi.fn();
const PLANTILLA = {
  name: 'promo_noviembre',
  language: 'es',
  category: 'MARKETING',
  components: [{ type: 'BODY', text: 'Hola {{1}}, hay novedades.' }],
};
const bandejas = ref([]);

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: vi.fn() }),
  useMapGetter: nombre =>
    ({
      'dashboardApps/getRecords': ref([
        { content: [{ url: 'https://api.crm.x/dashboard-app?token=T' }] },
      ]),
      getCurrentUser: ref({ id: 7, name: 'Admin', access_token: 'U' }),
      'inboxes/getWhatsAppInboxes': bandejas,
      'inboxes/getFilteredWhatsAppTemplates': ref(() => [PLANTILLA]),
    })[nombre],
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 } }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => alerta(...args),
}));
// La cabecera de Chatwoot arrastra el router entero; aqui no pinta nada.
vi.mock(
  'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue',
  () => ({ default: { render: () => null } })
);

const FILA = {
  attributeKey: 'crm_stage_name',
  filterOperator: 'equal_to',
  values: { id: 'Seguimiento', name: 'Seguimiento' },
  queryOperator: 'and',
};

// El filtro de Chatwoot tira de medio almacen: aqui, uno que ya trae su fila.
const filtroValido = ref(true);
const FiltroFalso = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(_p, { expose }) {
    expose({
      validar: () => filtroValido.value,
      filaNueva: () => ({ ...FILA }),
      tipos: [
        {
          attributeKey: 'crm_stage_name',
          attributeName: 'Etapa del lead',
          filterOperators: [
            { value: 'equal_to', label: 'Igual a', hasInput: true },
          ],
        },
      ],
    });
    return () => null;
  },
};

// El parser de plantillas, con los huecos ya rellenos.
const parametros = ref({ body: { 1: '{nombre}' } });
const ParserFalso = {
  props: ['template'],
  setup(_p, { expose }) {
    expose({ processedParams: parametros, isFormInvalid: false });
    return () => null;
  },
};

const ENVIO = {
  id: 'e1',
  titulo: 'Promo de noviembre',
  estado: 'SENDING',
  total: 2,
  plantilla: 'promo_noviembre',
  texto: 'Hola {{1}}, hay novedades.',
  filtros: 'Etapa del lead igual a Seguimiento',
  conteos: {
    pendientes: 1,
    enviados: 1,
    entregados: 0,
    leidos: 0,
    fallidos: 0,
    cancelados: 0,
  },
  creadoPor: 'Admin',
  creadoEn: '2026-11-25T15:00:00Z',
};
const DETALLE = {
  ...ENVIO,
  destinatarios: [
    {
      conversationId: 10,
      nombre: 'Ana',
      telefono: '+51911111111',
      estado: 'SENT',
      error: null,
    },
    {
      conversationId: 11,
      nombre: 'Luis',
      telefono: '+51922222222',
      estado: 'PENDING',
      error: null,
    },
  ],
};
const AUDIENCIA = {
  audienciaId: 'aud-1',
  total: 2,
  destinatarios: [
    {
      conversationId: 10,
      nombre: 'Ana',
      telefono: '+51911111111',
      etapa: 'Seguimiento',
      asesor: 'Eva',
    },
    {
      conversationId: 11,
      nombre: 'Luis',
      telefono: '+51922222222',
      etapa: 'Seguimiento',
      asesor: null,
    },
  ],
  fuera: { otraBandeja: 3, repetidos: 0 },
};

/** La API: responde segun la ruta y apunta lo que se le pidio. */
function api({ envios = [], error = null } = {}) {
  const llamadas = [];
  const fetchFalso = vi.fn(async (url, init = {}) => {
    const ruta = url.replace('https://api.crm.x/dashboard-app/difusiones', '');
    const cuerpo = init.body ? JSON.parse(init.body) : null;
    llamadas.push({
      ruta,
      metodo: init.method || 'GET',
      cuerpo,
      headers: init.headers,
    });
    if (error) return { ok: false, json: async () => ({ message: error }) };
    let respuesta = { envios };
    if (ruta === '/audiencia') respuesta = AUDIENCIA;
    else if (ruta === '' && init.method === 'POST') respuesta = DETALLE;
    else if (ruta.endsWith('/cancelar'))
      respuesta = { ...DETALLE, estado: 'CANCELLED' };
    else if (ruta.startsWith('/e1')) respuesta = DETALLE;
    return { ok: true, json: async () => respuesta };
  });
  vi.stubGlobal('fetch', fetchFalso);
  return llamadas;
}

const montar = async () => {
  const w = mount(MensajesMasivosPage, {
    global: {
      stubs: {
        Icon: true,
        RouterLink: { template: '<a><slot /></a>' },
        FiltroDeAudiencia: FiltroFalso,
        WhatsAppTemplateParser: ParserFalso,
      },
    },
  });
  await flushPromises();
  return w;
};

const escribir = async (w, etiqueta, valor) => {
  const campo = w
    .findAll('label')
    .find(l => l.text().includes(etiqueta))
    .element.closest('div')
    .querySelector('input');
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
  await flushPromises();
};

/** De la lista al formulario, con la audiencia vista y la plantilla elegida. */
async function hastaEnviar(w) {
  await w.find('[data-turuta="nuevo-envio"]').trigger('click');
  await flushPromises();
  await w.find('[data-turuta="ver-audiencia"]').trigger('click');
  await flushPromises();
  await w.find('select').setValue('promo_noviembre|es');
  await flushPromises();
}

describe('MensajesMasivosPage', () => {
  beforeEach(() => {
    alerta.mockClear();
    filtroValido.value = true;
    parametros.value = { body: { 1: '{nombre}' } };
    bandejas.value = [{ id: 3, name: 'Ventas', phone_number: '+51900000000' }];
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sin envios, lo dice y ofrece hacer uno', async () => {
    const llamadas = api();
    const w = await montar();
    expect(w.text()).toContain('Todavía no hay ningún envío');
    expect(llamadas[0]).toMatchObject({ ruta: '?accountId=1', metodo: 'GET' });
    expect(llamadas[0].headers['X-Chatwoot-Usuario']).toBe('U');
  });

  it('la lista: cada envio con sus numeros, y se abre su detalle', async () => {
    api({ envios: [ENVIO] });
    const w = await montar();
    const tarjeta = w.find('[data-turuta="envio"]');
    expect(tarjeta.text()).toContain('Promo de noviembre');
    expect(tarjeta.text()).toContain('Enviando');
    expect(tarjeta.text()).toContain('50 %');
    expect(tarjeta.text()).toContain('2 personas');

    await tarjeta.trigger('click');
    await flushPromises();
    expect(w.text()).toContain('Etapa del lead igual a Seguimiento');
    expect(w.text()).toContain('Luis');
    expect(w.text()).toContain('En cola');
  });

  it('si la API dice que no, se ve por que', async () => {
    api({ error: 'Para los mensajes masivos hay que entrar con tu usuario' });
    const w = await montar();
    expect(w.text()).toContain('hay que entrar con tu usuario');
  });

  it('ver a quienes: manda la consulta del filtro y pinta la lista', async () => {
    const llamadas = api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();

    const pedido = llamadas.find(l => l.ruta === '/audiencia');
    expect(pedido.cuerpo).toEqual({
      accountId: 1,
      inboxId: 3,
      filtros: {
        payload: [
          {
            attribute_key: 'crm_stage_name',
            filter_operator: 'equal_to',
            values: ['Seguimiento'],
          },
        ],
      },
    });
    const lista = w.find('[data-turuta="audiencia"]');
    expect(lista.text()).toContain('Les llega a 2 personas');
    expect(lista.text()).toContain('Ana');
    expect(lista.text()).toContain('3 chats cumplen el filtro');
  });

  it('un filtro a medias no se manda', async () => {
    const llamadas = api();
    filtroValido.value = false;
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();
    expect(llamadas.some(l => l.ruta === '/audiencia')).toBe(false);
    expect(w.text()).toContain('Hay un filtro sin terminar');
  });

  it('no se puede enviar sin nombre, sin lo que va en vez de {nombre} y sin escribir ENVIAR', async () => {
    api();
    const w = await montar();
    await hastaEnviar(w);
    const boton = () => w.find('[data-turuta="enviar"]');
    expect(boton().attributes('disabled')).toBeDefined();

    await escribir(w, 'Nombre del envío', 'Promo de noviembre');
    await escribir(w, 'Escribe ENVIAR', 'enviar');
    // Falta decir que poner si el contacto no tiene nombre.
    expect(boton().attributes('disabled')).toBeDefined();

    await escribir(w, 'Si el contacto no tiene nombre', 'vecino');
    expect(boton().attributes('disabled')).toBeUndefined();
  });

  it('enviar: manda la lista que se vio, la plantilla y sus datos, y pasa al detalle', async () => {
    const llamadas = api();
    const w = await montar();
    await hastaEnviar(w);
    await escribir(w, 'Nombre del envío', ' Promo de noviembre ');
    await escribir(w, 'Si el contacto no tiene nombre', 'vecino');
    await escribir(w, 'Escribe ENVIAR', 'ENVIAR');
    await w.find('form').trigger('submit');
    await flushPromises();

    const pedido = llamadas.find(l => l.ruta === '' && l.metodo === 'POST');
    expect(pedido.cuerpo).toEqual({
      accountId: 1,
      inboxId: 3,
      audienciaId: 'aud-1',
      titulo: 'Promo de noviembre',
      plantilla: { nombre: 'promo_noviembre', idioma: 'es' },
      params: { body: { 1: '{nombre}' } },
      sinNombre: 'vecino',
      filtrosTexto: 'Etapa del lead igual a Seguimiento',
    });
    expect(alerta).toHaveBeenCalledWith(
      'El envío a 2 personas ya está saliendo.'
    );
    expect(w.find('[data-turuta="cancelar"]').exists()).toBe(true);
  });

  it('sin {nombre} en la plantilla no se pregunta que poner en su lugar', async () => {
    api();
    parametros.value = { body: { 1: 'Surco' } };
    const w = await montar();
    await hastaEnviar(w);
    expect(w.text()).not.toContain('Si el contacto no tiene nombre');
  });

  it('cancelar un envio que esta saliendo', async () => {
    const llamadas = api({ envios: [ENVIO] });
    const w = await montar();
    await w.find('[data-turuta="envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="cancelar"]').trigger('click');
    await flushPromises();
    expect(llamadas.at(-1)).toMatchObject({
      ruta: '/e1/cancelar',
      metodo: 'POST',
    });
    expect(w.text()).toContain('Cancelado');
    expect(w.find('[data-turuta="cancelar"]').exists()).toBe(false);
  });

  it('sin numero de WhatsApp conectado, lo dice en vez de ofrecer el formulario', async () => {
    api();
    bandejas.value = [];
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    expect(w.text()).toContain('no tiene ningún número de WhatsApp');
    expect(w.find('[data-turuta="ver-audiencia"]').exists()).toBe(false);
  });
});
