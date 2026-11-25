import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  avance,
  borradorConAlgo,
  guardarBorrador,
  leerBorrador,
  volcarValores,
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
