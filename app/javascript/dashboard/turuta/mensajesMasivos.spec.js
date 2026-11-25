import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  avance,
  borradorConAlgo,
  guardarBorrador,
  leerBorrador,
  volcarValores,
  nombreCompleto,
  personaDeEjemplo,
  primerNombre,
  queFalta,
  vistaDeMensaje,
  clienteDeDifusion,
  consultaDeFiltros,
  cuantoTarda,
  filasConValor,
  opcionesDePlantilla,
  plantillaElegida,
  textoDeFiltros,
  usaNombre,
} from './mensajesMasivos';

// Los filtros como los da useConversationFilterContext, recortados.
const IGUAL = { value: 'equal_to', label: 'Igual a', hasInput: true };
const PRESENTE = {
  value: 'is_present',
  label: 'Está presente',
  hasInput: false,
};
const TIPOS = [
  {
    attributeKey: 'crm_stage_name',
    attributeName: 'Etapa del lead',
    filterOperators: [IGUAL, PRESENTE],
  },
  {
    attributeKey: 'labels',
    attributeName: 'Etiquetas',
    filterOperators: [IGUAL],
  },
  {
    attributeKey: 'assignee_id',
    attributeName: 'Agente asignado',
    filterOperators: [IGUAL, PRESENTE],
  },
];

const etapa = {
  attributeKey: 'crm_stage_name',
  filterOperator: 'equal_to',
  values: { id: 'Seguimiento', name: 'Seguimiento' },
  queryOperator: 'and',
};
const etiquetas = {
  attributeKey: 'labels',
  filterOperator: 'equal_to',
  values: [
    { id: 'surco', name: 'surco' },
    { id: 'miraflores', name: 'miraflores' },
  ],
  queryOperator: 'or',
};
const conAsesor = {
  attributeKey: 'assignee_id',
  filterOperator: 'is_present',
  values: '',
  queryOperator: 'and',
};

describe('filasConValor', () => {
  it('deja fuera la fila que se ofrece al abrir, sin tocar', () => {
    const vacia = { ...etapa, values: {} };
    const sinEtiquetas = { ...etiquetas, values: [] };
    expect(filasConValor([vacia, etapa, sinEtiquetas], TIPOS)).toEqual([etapa]);
  });

  it('un operador que no pide valor cuenta aunque no lo tenga', () => {
    expect(filasConValor([conAsesor], TIPOS)).toEqual([conAsesor]);
  });

  it('sin filas, nada', () => {
    expect(filasConValor(null, TIPOS)).toEqual([]);
  });
});

describe('consultaDeFiltros', () => {
  it('la misma consulta que manda la lista de chats', () => {
    expect(consultaDeFiltros([etapa, etiquetas])).toEqual({
      payload: [
        {
          attribute_key: 'crm_stage_name',
          filter_operator: 'equal_to',
          values: ['Seguimiento'],
          query_operator: 'and',
        },
        {
          attribute_key: 'labels',
          filter_operator: 'equal_to',
          values: ['surco', 'miraflores'],
          // El operador de la ultima fila sobra: Chatwoot lo rechaza.
          query_operator: undefined,
        },
      ],
    });
  });

  it('no toca las filas de la pantalla', () => {
    const copia = JSON.parse(JSON.stringify(etapa));
    consultaDeFiltros([etapa]);
    expect(etapa).toEqual(copia);
  });

  it('sin filas no hay consulta', () => {
    expect(consultaDeFiltros([])).toBeNull();
  });
});

describe('textoDeFiltros', () => {
  it('se lee como una frase, con el «y / o» de la fila anterior', () => {
    expect(textoDeFiltros([etapa, etiquetas, conAsesor], TIPOS)).toBe(
      'Etapa del lead igual a Seguimiento y Etiquetas igual a surco, miraflores o Agente asignado está presente'
    );
  });

  it('un filtro que ya no existe sale con su clave, no se pierde', () => {
    const raro = {
      attributeKey: 'distrito',
      filterOperator: 'equal_to',
      values: 'Surco',
    };
    expect(textoDeFiltros([raro], TIPOS)).toBe('distrito equal_to Surco');
  });
});

describe('las plantillas', () => {
  const plantillas = [
    { name: 'promo', language: 'es' },
    { name: 'promo', language: 'en' },
  ];

  it('una opcion por plantilla e idioma', () => {
    expect(opcionesDePlantilla(plantillas)).toEqual([
      { value: 'promo|es', label: 'promo (es)' },
      { value: 'promo|en', label: 'promo (en)' },
    ]);
    expect(plantillaElegida(plantillas, 'promo|en')).toBe(plantillas[1]);
    expect(plantillaElegida(plantillas, '')).toBeNull();
  });

  it('usaNombre mira en el cuerpo, la cabecera y los botones', () => {
    expect(usaNombre({ body: { 1: 'Hola {nombre}' } })).toBe(true);
    expect(usaNombre({ buttons: [{ parameter: '{NOMBRE_COMPLETO}' }] })).toBe(
      true
    );
    expect(usaNombre({ body: { 1: 'Hola' }, header: { media_url: '' } })).toBe(
      false
    );
  });
});

describe('lo que se ve de un envio', () => {
  it('cuanto tarda', () => {
    expect(cuantoTarda(250)).toBe('menos de un minuto');
    expect(cuantoTarda(1500)).toBe('unos 5 minutos');
  });

  it('el avance: lo que ya no esta en cola', () => {
    expect(avance({ total: 200, conteos: { pendientes: 50 } })).toBe(75);
    expect(avance({ total: 0 })).toBe(0);
    expect(avance(null)).toBe(0);
  });
});

describe('clienteDeDifusion', () => {
  afterEach(() => vi.unstubAllGlobals());

  const config = { api: 'https://api.crm.x', token: 'T' };
  const usuario = { access_token: 'U' };

  it('manda el token del panel y, aparte, el del usuario', async () => {
    const fetchFalso = vi.fn(async () => ({
      ok: true,
      json: async () => ({ total: 3 }),
    }));
    vi.stubGlobal('fetch', fetchFalso);
    const api = clienteDeDifusion(config, usuario, '4');

    await api.audiencia(9, { payload: [] });
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe('https://api.crm.x/dashboard-app/difusiones/audiencia');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer T',
      'X-Chatwoot-Usuario': 'U',
    });
    expect(JSON.parse(init.body)).toEqual({
      accountId: 4,
      inboxId: 9,
      filtros: { payload: [] },
    });

    await api.lista();
    expect(fetchFalso.mock.calls[1][0]).toBe(
      'https://api.crm.x/dashboard-app/difusiones?accountId=4'
    );
    await api.cancelar('e1');
    expect(fetchFalso.mock.calls[2][0]).toBe(
      'https://api.crm.x/dashboard-app/difusiones/e1/cancelar'
    );
  });

  it('el error de la API llega con su texto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ message: 'Ese filtro no alcanza a nadie' }),
      }))
    );
    await expect(
      clienteDeDifusion(config, usuario, 4).crear({})
    ).rejects.toThrow('Ese filtro no alcanza a nadie');
  });

  it('sin configuracion del CRM no se pide nada', async () => {
    await expect(clienteDeDifusion(null, usuario, 4).lista()).rejects.toThrow(
      'configuración'
    );
  });
});

describe('clienteDeDifusion: la lista de numeros y la aprobacion', () => {
  afterEach(() => vi.unstubAllGlobals());

  const conFetch = () => {
    const llamadas = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        llamadas.push({
          url,
          metodo: init.method || 'GET',
          cuerpo: init.body ? JSON.parse(init.body) : null,
        });
        return { ok: true, json: async () => ({}) };
      })
    );
    const api = clienteDeDifusion(
      { api: 'https://api.crm.x', token: 'T' },
      { access_token: 'U' },
      '4'
    );
    return { api, llamadas };
  };
  const BASE = 'https://api.crm.x/dashboard-app/difusiones';

  it('la lista de numeros va tal cual: la lee el servidor', async () => {
    const { api, llamadas } = conFetch();
    await api.audienciaDeLista(3, '987654321, 912 345 678');
    expect(llamadas[0]).toEqual({
      url: `${BASE}/audiencia`,
      metodo: 'POST',
      cuerpo: { accountId: 4, inboxId: 3, lista: '987654321, 912 345 678' },
    });
  });

  it('aprobar, no aprobar y dar permiso', async () => {
    const { api, llamadas } = conFetch();
    await api.aprobar('e1');
    await api.rechazar('e1', 'ya terminó');
    await api.permiso(9, true);
    expect(llamadas).toEqual([
      { url: `${BASE}/e1/aprobar`, metodo: 'POST', cuerpo: { accountId: 4 } },
      {
        url: `${BASE}/e1/rechazar`,
        metodo: 'POST',
        cuerpo: { accountId: 4, razon: 'ya terminó' },
      },
      {
        url: `${BASE}/permisos`,
        metodo: 'PUT',
        cuerpo: { accountId: 4, agenteId: 9, directo: true },
      },
    ]);
  });
});

describe('el borrador de un envio', () => {
  const almacen = () => {
    const datos = new Map();
    return {
      getItem: k => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => datos.set(k, v),
      removeItem: k => datos.delete(k),
    };
  };

  it('se guarda por cuenta, se lee y se borra', () => {
    const a = almacen();
    guardarBorrador(1, { titulo: 'Promo' }, a);
    expect(leerBorrador(1, a)).toEqual({ titulo: 'Promo' });
    expect(leerBorrador(2, a)).toBeNull();
    guardarBorrador(1, null, a);
    expect(leerBorrador(1, a)).toBeNull();
  });

  it('un almacen roto o que no deja escribir no rompe la pagina', () => {
    const roto = {
      getItem: () => '{no es json',
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => {},
    };
    expect(leerBorrador(1, roto)).toBeNull();
    expect(() => guardarBorrador(1, { titulo: 'x' }, roto)).not.toThrow();
  });

  it('borradorConAlgo: solo si hay algo escrito', () => {
    expect(borradorConAlgo(null)).toBe(false);
    // Lo que hay al abrir el formulario sin tocar nada: una fila sin valor.
    expect(
      borradorConAlgo({
        modo: 'filtros',
        lista: ' ',
        titulo: '',
        plantilla: '',
        filas: [{ attributeKey: 'crm_stage_name', values: {} }],
      })
    ).toBe(false);
    expect(borradorConAlgo({ titulo: 'Promo' })).toBe(true);
    expect(borradorConAlgo({ lista: '987654321' })).toBe(true);
    expect(borradorConAlgo({ plantilla: 'promo|es' })).toBe(true);
    expect(
      borradorConAlgo({ filas: [{ values: { id: 'Nuevo', name: 'Nuevo' } }] })
    ).toBe(true);
    expect(borradorConAlgo({ filas: [{ values: ['surco'] }] })).toBe(true);
  });

  it('volcarValores: pone lo escrito en los campos que la plantilla tiene, sin vaciar ninguno', () => {
    const campos = {
      body: { 1: '', 2: 'ya puesto', 3: '' },
      header: { media_url: '' },
      buttons: [{ type: 'url', parameter: '' }],
    };
    volcarValores(campos, {
      body: { 1: '{nombre}', 2: '', 9: 'de otra plantilla' },
      header: { media_url: 'https://x/y.jpg' },
      buttons: [{ type: 'url', parameter: 'abc' }],
    });
    expect(campos).toEqual({
      body: { 1: '{nombre}', 2: 'ya puesto', 3: '' },
      header: { media_url: 'https://x/y.jpg' },
      buttons: [{ type: 'url', parameter: 'abc' }],
    });
    // Sin nada guardado, o con cualquier cosa, no rompe.
    expect(() => volcarValores(campos, undefined)).not.toThrow();
    expect(() => volcarValores(null, { body: {} })).not.toThrow();
  });
});

describe('el mensaje tal como llega', () => {
  // recordatorio_visita, como la copia Chatwoot de Meta.
  const COMPONENTES = [
    { type: 'HEADER', format: 'TEXT', text: 'Recordatorio de visita' },
    {
      type: 'BODY',
      text: 'Hola {{1}}, te recordamos tu visita de hoy a las {{2}} en {{3}}.\n\n¿Sigue en pie?',
    },
    { type: 'FOOTER', text: 'MadHouse' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Confirmar' },
        { type: 'URL', text: 'Ver el mapa', url: 'https://x/{{1}}' },
      ],
    },
  ];

  it('cabecera, cuerpo con lo escrito, pie y botones', () => {
    const v = vistaDeMensaje(COMPONENTES, {
      body: { 1: '{nombre}', 2: '3pm', 3: 'Lince' },
    });
    expect(v).toEqual({
      cabecera: { tipo: 'TEXT', texto: 'Recordatorio de visita', url: '' },
      cuerpo:
        'Hola {nombre}, te recordamos tu visita de hoy a las 3pm en Lince.\n\n¿Sigue en pie?',
      pie: 'MadHouse',
      botones: [
        { tipo: 'QUICK_REPLY', texto: 'Confirmar' },
        { tipo: 'URL', texto: 'Ver el mapa' },
      ],
    });
  });

  it('un campo sin llenar se queda a la vista, para que se note', () => {
    const v = vistaDeMensaje(COMPONENTES, { body: { 1: 'Ana', 2: '', 3: '' } });
    expect(v.cuerpo).toContain(
      'Hola Ana, te recordamos tu visita de hoy a las {{2}} en {{3}}.'
    );
  });

  it('con una persona, {nombre} sale ya cambiado', () => {
    const params = {
      body: { 1: '{nombre}', 2: '3pm', 3: '{nombre_completo}' },
    };
    const v = vistaDeMensaje(COMPONENTES, params, {
      nombre: 'Kiev',
      completo: 'Kiev Ruiz',
    });
    expect(v.cuerpo).toContain(
      'Hola Kiev, te recordamos tu visita de hoy a las 3pm en Kiev Ruiz.'
    );
    // Sin saber que poner (contacto sin nombre y sin el texto de reserva), se queda.
    const sin = vistaDeMensaje(COMPONENTES, params, {
      nombre: null,
      completo: null,
    });
    expect(sin.cuerpo).toContain('Hola {nombre},');
  });

  it('una cabecera con imagen lleva su direccion; una plantilla de solo cuerpo, nada mas', () => {
    const conImagen = vistaDeMensaje(
      [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'Hola' },
      ],
      { header: { media_url: 'https://x/y.jpg' } }
    );
    expect(conImagen.cabecera).toEqual({
      tipo: 'IMAGE',
      texto: '',
      url: 'https://x/y.jpg',
    });
    expect(vistaDeMensaje([{ type: 'BODY', text: 'Hola' }], {})).toEqual({
      cabecera: null,
      cuerpo: 'Hola',
      pie: '',
      botones: [],
    });
    expect(vistaDeMensaje(undefined, undefined).cuerpo).toBe('');
  });

  it('primerNombre y nombreCompleto, igual que en la API', () => {
    expect(primerNombre('ana ruiz')).toBe('Ana');
    expect(primerNombre('JUAN PÉREZ')).toBe('Juan');
    expect(primerNombre('McDonald Ruiz')).toBe('McDonald');
    expect(primerNombre('51966723347')).toBeNull();
    expect(primerNombre(null)).toBeNull();
    expect(nombreCompleto('  ana   ruiz ')).toBe('ana ruiz');
    expect(nombreCompleto('+51 966 723 347')).toBeNull();
  });

  it('personaDeEjemplo: su nombre, o lo que se eligio si no tiene', () => {
    expect(personaDeEjemplo({ nombre: 'kiev' }, 'Estimado')).toEqual({
      nombre: 'Kiev',
      completo: 'kiev',
    });
    expect(personaDeEjemplo({ nombre: '51966723347' }, ' Estimado ')).toEqual({
      nombre: 'Estimado',
      completo: 'Estimado',
    });
    expect(personaDeEjemplo({ nombre: null }, '')).toEqual({
      nombre: null,
      completo: null,
    });
    expect(personaDeEjemplo(null, 'x')).toBeNull();
  });
});

describe('queFalta: por que no se puede enviar todavia', () => {
  const LISTO = {
    audiencia: { total: 2 },
    hayPlantillas: true,
    plantilla: { name: 'promo' },
    plantillaLista: true,
    pideNombre: true,
    sinNombre: 'vecino',
    titulo: 'Promo',
    confirmacion: 'enviar',
  };

  it('con todo, nada', () => {
    expect(queFalta(LISTO)).toEqual([]);
  });

  it('el caso del 25/11: todo lleno menos lo que va en lugar del nombre', () => {
    const f = queFalta({ ...LISTO, sinNombre: ' ' });
    expect(f).toHaveLength(1);
    expect(f[0]).toContain('cuando el contacto no tiene nombre');
    // Si la plantilla no usa {nombre}, no se pide.
    expect(queFalta({ ...LISTO, sinNombre: '', pideNombre: false })).toEqual(
      []
    );
  });

  it('cada cosa que falta, con su paso', () => {
    const f = queFalta({
      audiencia: null,
      hayPlantillas: true,
      plantilla: null,
      plantillaLista: false,
      pideNombre: false,
      sinNombre: '',
      titulo: '',
      confirmacion: '',
    });
    expect(f).toEqual([
      'Pulsa «Ver a quiénes les llega» (paso 1).',
      'Elige la plantilla (paso 2).',
      'Ponle un nombre al envío.',
      'Escribe ENVIAR en el recuadro de abajo.',
    ]);
  });

  it('una lista que no alcanza a nadie, campos a medias y un numero sin plantillas', () => {
    expect(queFalta({ ...LISTO, audiencia: { total: 0 } })[0]).toContain(
      'Nadie recibe el mensaje'
    );
    expect(queFalta({ ...LISTO, plantillaLista: false })[0]).toContain(
      'Llena todos los campos'
    );
    expect(
      queFalta({ ...LISTO, hayPlantillas: false, plantilla: null })[0]
    ).toContain('no tiene plantillas aprobadas');
  });
});
