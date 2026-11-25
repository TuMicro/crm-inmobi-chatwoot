import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import MensajesMasivosPage from './MensajesMasivosPage.vue';

const alerta = vi.fn();
const PLANTILLA = {
  name: 'promo_noviembre',
  language: 'es',
  category: 'MARKETING',
  components: [
    { type: 'BODY', text: 'Hola {{1}}, hay novedades.' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Me interesa' },
        { type: 'URL', text: 'Ver más', url: 'https://x' },
      ],
    },
  ],
};
const bandejas = ref([]);
// El almacen de Chatwoot: se puede "recargar" a mitad de una prueba.
const plantillasDe = ref(() => [PLANTILLA]);
const agentes = ref([]);

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: vi.fn() }),
  useMapGetter: nombre =>
    ({
      'dashboardApps/getRecords': ref([
        { content: [{ url: 'https://api.crm.x/dashboard-app?token=T' }] },
      ]),
      getCurrentUser: ref({ id: 7, name: 'Admin', access_token: 'U' }),
      'inboxes/getWhatsAppInboxes': bandejas,
      'inboxes/getFilteredWhatsAppTemplates': plantillasDe,
      'agents/getAgents': agentes,
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

// El parser de plantillas, con los campos ya rellenos.
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
const AUDIENCIA_DE_LISTA = {
  audienciaId: 'aud-2',
  total: 2,
  nuevos: 1,
  destinatarios: [
    {
      conversationId: 10,
      nombre: 'Ana',
      telefono: '+51911111111',
      etapa: 'Seguimiento',
      asesor: 'Eva',
    },
    {
      conversationId: null,
      nombre: null,
      telefono: '+51987654321',
      etapa: null,
      asesor: null,
    },
  ],
  fuera: {
    otraBandeja: 0,
    repetidos: 1,
    noReconocidos: ['Juan'],
    usuariosSinChat: ['nadie'],
    deOtroAsesor: 2,
  },
};
const ADMIN = { admin: true, directo: true };
const ASESOR = { admin: false, directo: false };

/** La API: responde segun la ruta y apunta lo que se le pidio. */
function api({ envios = [], error = null, yo = ADMIN, detalle = null } = {}) {
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
    const elDetalle = detalle || DETALLE;
    let respuesta = { envios, yo, ...(yo.admin ? { directos: [] } : {}) };
    if (ruta === '/audiencia')
      respuesta = cuerpo.lista === undefined ? AUDIENCIA : AUDIENCIA_DE_LISTA;
    else if (ruta === '/permisos')
      respuesta = { directos: cuerpo.directo ? [cuerpo.agenteId] : [] };
    else if (ruta === '' && init.method === 'POST')
      respuesta = yo.directo
        ? DETALLE
        : { ...DETALLE, estado: 'PENDING_APPROVAL' };
    else if (ruta.endsWith('/cancelar'))
      respuesta = { ...DETALLE, estado: 'CANCELLED' };
    else if (ruta.endsWith('/aprobar'))
      respuesta = { ...DETALLE, estado: 'SENDING', aprobadoPor: 'Admin' };
    else if (ruta.endsWith('/rechazar'))
      respuesta = {
        ...DETALLE,
        estado: 'REJECTED',
        rechazadoPor: 'Admin',
        razonDelRechazo: cuerpo.razon,
      };
    else if (ruta.startsWith('/e1')) respuesta = elDetalle;
    return { ok: true, json: async () => respuesta };
  });
  vi.stubGlobal('fetch', fetchFalso);
  return llamadas;
}

// Las pantallas montadas en una prueba: se desmontan al acabar, o seguirian
// guardando su borrador mientras corre la siguiente.
const montadas = [];

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
  montadas.push(w);
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
    plantillasDe.value = () => [PLANTILLA];
    agentes.value = [
      { id: 7, name: 'Admin', role: 'administrator' },
      { id: 9, name: 'Eva', role: 'agent' },
    ];
    // El borrador de un envio vive en la pestana: cada prueba, la suya.
    window.sessionStorage.clear();
  });
  afterEach(() => {
    montadas.splice(0).forEach(w => w.unmount());
    vi.unstubAllGlobals();
  });

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

  // ------------------------------------------------- una lista de numeros

  it('una lista de numeros: manda lo que se pego y dice quien es nuevo y que no entendio', async () => {
    const llamadas = api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="modo-lista"]').trigger('click');
    await w
      .find('[data-turuta="lista"]')
      .setValue('911111111, 987 654 321\nJuan');
    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();

    const pedido = llamadas.find(l => l.ruta === '/audiencia');
    expect(pedido.cuerpo).toEqual({
      accountId: 1,
      inboxId: 3,
      lista: '911111111, 987 654 321\nJuan',
    });
    const lista = w.find('[data-turuta="audiencia"]');
    expect(lista.text()).toContain('Les llega a 2 personas');
    expect(lista.text()).toContain('es un número nuevo');
    expect(lista.text()).toContain('Nuevo');
    expect(lista.text()).toContain('Una entrada no es un número');
    expect(lista.text()).toContain('Juan');
    expect(lista.text()).toContain('@nadie');
    expect(lista.text()).toContain('2 son leads de otro asesor');
  });

  it('una lista vacia no se manda', async () => {
    const llamadas = api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="modo-lista"]').trigger('click');
    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();
    expect(llamadas.some(l => l.ruta === '/audiencia')).toBe(false);
    expect(w.text()).toContain('Escribe o pega al menos un número');
  });

  it('cambiar la lista despues de verla obliga a verla otra vez', async () => {
    api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="modo-lista"]').trigger('click');
    await w.find('[data-turuta="lista"]').setValue('911111111');
    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();
    expect(w.find('[data-turuta="audiencia"]').exists()).toBe(true);
    await w.find('[data-turuta="lista"]').setValue('911111111, 922222222');
    await flushPromises();
    expect(w.find('[data-turuta="audiencia"]').exists()).toBe(false);
  });

  // ------------------------------------------------------- la aprobacion

  it('un asesor sin permiso no envia: solicita, y se le dice', async () => {
    const llamadas = api({ yo: ASESOR });
    const w = await montar();
    await hastaEnviar(w);
    expect(w.find('[data-turuta="pide-aprobacion"]').exists()).toBe(true);
    expect(w.find('[data-turuta="enviar"]').text()).toContain(
      'Solicitar envío a 2'
    );
    await escribir(w, 'Nombre del envío', 'Promo');
    await escribir(w, 'Si el contacto no tiene nombre', 'vecino');
    await escribir(w, 'Escribe ENVIAR', 'ENVIAR');
    await w.find('form').trigger('submit');
    await flushPromises();

    expect(llamadas.some(l => l.ruta === '' && l.metodo === 'POST')).toBe(true);
    expect(alerta).toHaveBeenCalledWith(
      'Solicitud enviada: saldrá cuando un administrador la apruebe.'
    );
    expect(w.text()).toContain('Esperando la aprobación de un administrador');
    // Puede retirarla; aprobarla, no.
    expect(w.find('[data-turuta="retirar"]').exists()).toBe(true);
    expect(w.find('[data-turuta="aprobar"]').exists()).toBe(false);
  });

  it('a quien envia directamente no se le habla de aprobacion', async () => {
    api({ yo: { admin: false, directo: true } });
    const w = await montar();
    await hastaEnviar(w);
    expect(w.find('[data-turuta="pide-aprobacion"]').exists()).toBe(false);
    expect(w.find('[data-turuta="enviar"]').text()).toContain('Enviar a 2');
  });

  const PENDIENTE = { ...ENVIO, estado: 'PENDING_APPROVAL', creadoPor: 'Eva' };
  const abrirPendiente = async yo => {
    const llamadas = api({
      envios: [PENDIENTE],
      yo,
      detalle: { ...DETALLE, estado: 'PENDING_APPROVAL', creadoPor: 'Eva' },
    });
    const w = await montar();
    expect(w.find('[data-turuta="envio"]').text()).toContain(
      'Espera aprobación'
    );
    await w.find('[data-turuta="envio"]').trigger('click');
    await flushPromises();
    return { w, llamadas };
  };

  it('un administrador aprueba el envio de un asesor, en dos pasos', async () => {
    const { w, llamadas } = await abrirPendiente(ADMIN);
    expect(w.find('[data-turuta="por-aprobar"]').text()).toContain(
      'Eva pide enviar este mensaje a 2 personas'
    );
    await w.find('[data-turuta="aprobar"]').trigger('click');
    // El primer clic no envia nada.
    expect(llamadas.some(l => l.ruta.endsWith('/aprobar'))).toBe(false);
    await w.find('[data-turuta="aprobar-si"]').trigger('click');
    await flushPromises();
    expect(llamadas.at(-1)).toMatchObject({
      ruta: '/e1/aprobar',
      metodo: 'POST',
      cuerpo: { accountId: 1 },
    });
    expect(w.find('[data-turuta="por-aprobar"]').exists()).toBe(false);
    expect(w.text()).toContain('aprobado por Admin');
  });

  it('un administrador no lo aprueba y dice por que', async () => {
    const { w, llamadas } = await abrirPendiente(ADMIN);
    await w.find('[data-turuta="no-aprobar"]').trigger('click');
    await escribir(w, 'Por qué no', 'Esa promoción ya terminó');
    await w.find('[data-turuta="por-aprobar"] form').trigger('submit');
    await flushPromises();
    expect(llamadas.at(-1)).toMatchObject({
      ruta: '/e1/rechazar',
      cuerpo: { accountId: 1, razon: 'Esa promoción ya terminó' },
    });
    expect(w.find('[data-turuta="rechazado"]').text()).toContain(
      'Esa promoción ya terminó'
    );
  });

  it('el asesor que lo pidio puede retirarlo', async () => {
    const { w, llamadas } = await abrirPendiente(ASESOR);
    await w.find('[data-turuta="retirar"]').trigger('click');
    await flushPromises();
    expect(llamadas.at(-1).ruta).toBe('/e1/cancelar');
    expect(alerta).toHaveBeenCalledWith('Solicitud retirada: no sale nada.');
  });

  it('el administrador marca que asesor envia sin pedir aprobacion', async () => {
    const llamadas = api();
    const w = await montar();
    const permisos = w.find('[data-turuta="permisos"]');
    // Solo los asesores: un administrador no pide aprobacion a nadie.
    expect(permisos.text()).toContain('Eva');
    expect(permisos.text()).not.toContain('Admin');
    expect(permisos.text()).toContain('pide aprobación');
    await permisos.find('input[type="checkbox"]').setValue(true);
    await flushPromises();
    expect(llamadas.at(-1)).toMatchObject({
      ruta: '/permisos',
      metodo: 'PUT',
      cuerpo: { accountId: 1, agenteId: 9, directo: true },
    });
    expect(permisos.text()).toContain('envía directamente');
  });

  it('un asesor no ve quien envia sin aprobacion', async () => {
    api({ yo: ASESOR });
    const w = await montar();
    expect(w.find('[data-turuta="permisos"]').exists()).toBe(false);
  });

  // ---------------------------------------- lo escrito no se pierde (25/11)

  it('Chatwoot recarga las bandejas: la plantilla elegida y sus campos siguen igual', async () => {
    api();
    const w = await montar();
    await hastaEnviar(w);
    const antes = w.findComponent(ParserFalso).props('template');
    expect(antes).toEqual(PLANTILLA);
    // Llega otra copia de las mismas plantillas, como cuando el servidor avisa
    // de que cambiaron las bandejas.
    plantillasDe.value = () => [JSON.parse(JSON.stringify(PLANTILLA))];
    await flushPromises();
    // El parser reinicia sus campos cuando cambia el objeto: no debe cambiar.
    expect(w.findComponent(ParserFalso).props('template')).toBe(antes);
  });

  it('si la pagina se vuelve a montar, el formulario sigue como estaba', async () => {
    api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('[data-turuta="modo-lista"]').trigger('click');
    await w.find('[data-turuta="lista"]').setValue('911111111, 922222222');
    await w.find('select').setValue('promo_noviembre|es');
    await flushPromises();
    parametros.value.body[1] = 'Surco';
    await escribir(w, 'Nombre del envío', 'Promo BlackFriday');
    w.unmount();

    // El parser nuevo nace con sus campos vacios.
    parametros.value = { body: { 1: '' } };
    const w2 = await montar();
    expect(w2.text()).toContain('Recuperamos lo que tenías escrito');
    expect(w2.find('[data-turuta="lista"]').element.value).toBe(
      '911111111, 922222222'
    );
    expect(w2.find('select').element.value).toBe('promo_noviembre|es');
    expect(parametros.value.body[1]).toBe('Surco');
    const titulo = w2
      .findAll('label')
      .find(l => l.text().includes('Nombre del envío'))
      .element.closest('div')
      .querySelector('input');
    expect(titulo.value).toBe('Promo BlackFriday');

    // Y se puede tirar.
    await w2.find('[data-turuta="de-cero"]').trigger('click');
    await flushPromises();
    expect(w2.text()).not.toContain('Recuperamos lo que tenías escrito');
    expect(w2.find('[data-turuta="lista"]').exists()).toBe(false);
  });

  it('salir del formulario a proposito lleva a la lista, pero guarda lo escrito', async () => {
    api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await escribir(w, 'Nombre del envío', 'Promo');
    await w
      .findAll('button')
      .find(b => b.text().includes('Volver a los envíos'))
      .trigger('click');
    await flushPromises();
    w.unmount();

    const w2 = await montar();
    expect(w2.find('[data-turuta="nuevo-envio"]').exists()).toBe(true);
    await w2.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    expect(w2.text()).toContain('Recuperamos lo que tenías escrito');
  });

  it('despues de enviar no queda borrador', async () => {
    api();
    const w = await montar();
    await hastaEnviar(w);
    await escribir(w, 'Nombre del envío', 'Promo');
    await escribir(w, 'Si el contacto no tiene nombre', 'vecino');
    await escribir(w, 'Escribe ENVIAR', 'ENVIAR');
    await w.find('form').trigger('submit');
    await flushPromises();
    w.unmount();
    const w2 = await montar();
    expect(w2.find('[data-turuta="nuevo-envio"]').exists()).toBe(true);
    expect(w2.text()).not.toContain('Recuperamos');
  });

  // ------------------------------- el mensaje a la vista y lo que falta

  it('ensena el mensaje como llega, con sus botones y el nombre de la primera persona', async () => {
    api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    await w.find('select').setValue('promo_noviembre|es');
    await flushPromises();
    const vista = () => w.find('[data-turuta="vista-de-mensaje"]');
    // Sin haber visto la lista, {nombre} se queda a la vista.
    expect(vista().text()).toContain('Hola {nombre}, hay novedades.');
    expect(
      vista()
        .findAll('[data-turuta="vista-boton"]')
        .map(b => b.text())
    ).toEqual(['Me interesa', 'Ver más']);

    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();
    expect(vista().text()).toContain('Hola Ana, hay novedades.');
    expect(w.text()).toContain('Como le llega a Ana, la primera persona');
  });

  it('dice que falta para poder enviar, y lo va quitando', async () => {
    api();
    const w = await montar();
    await w.find('[data-turuta="nuevo-envio"]').trigger('click');
    await flushPromises();
    const falta = () =>
      w.findAll('[data-turuta="falta"] li').map(li => li.text());
    expect(falta()).toEqual([
      'Pulsa «Ver a quiénes les llega» (paso 1).',
      'Elige la plantilla (paso 2).',
      'Ponle un nombre al envío.',
      'Escribe ENVIAR en el recuadro de abajo.',
    ]);

    await w.find('[data-turuta="ver-audiencia"]').trigger('click');
    await flushPromises();
    await w.find('select').setValue('promo_noviembre|es');
    await flushPromises();
    await escribir(w, 'Nombre del envío', 'Promo');
    await escribir(w, 'Escribe ENVIAR', 'ENVIAR');
    // Lo que le paso a Kefrin el 25/11: todo lleno y el boton apagado.
    expect(falta()).toEqual([
      'Escribe qué poner cuando el contacto no tiene nombre (paso 2, debajo de los campos).',
    ]);
    expect(w.text()).toContain('Falta llenarlo');
    expect(
      w.find('[data-turuta="enviar"]').attributes('disabled')
    ).toBeDefined();

    await escribir(w, 'Si el contacto no tiene nombre', 'vecino');
    expect(w.find('[data-turuta="falta"]').exists()).toBe(false);
    expect(
      w.find('[data-turuta="enviar"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('el detalle de un envio ensena el mensaje con sus botones', async () => {
    api({
      envios: [ENVIO],
      detalle: {
        ...DETALLE,
        componentes: PLANTILLA.components,
        params: { body: { 1: '{nombre}' } },
      },
    });
    const w = await montar();
    await w.find('[data-turuta="envio"]').trigger('click');
    await flushPromises();
    const vista = w.find('[data-turuta="vista-de-mensaje"]');
    expect(vista.text()).toContain('Hola {nombre}, hay novedades.');
    expect(vista.findAll('[data-turuta="vista-boton"]')).toHaveLength(2);
    expect(w.text()).toContain('sale el nombre de cada persona');
  });

  it('un envio antiguo, sin la plantilla guardada, ensena su texto', async () => {
    api({ envios: [ENVIO] });
    const w = await montar();
    await w.find('[data-turuta="envio"]').trigger('click');
    await flushPromises();
    expect(w.find('[data-turuta="vista-de-mensaje"]').exists()).toBe(false);
    expect(w.text()).toContain('Hola {{1}}, hay novedades.');
  });
});
