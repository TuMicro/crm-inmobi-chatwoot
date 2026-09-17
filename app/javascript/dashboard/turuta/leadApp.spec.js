import {
  isLeadApp,
  leadAppConfig,
  withLeadItems,
  cuando,
  cuandoVisita,
  fechaInput,
  horaInput,
  isoDesdeInputs,
  textoVisita,
  LEAD_SIDEBAR_ITEM,
  ORDEN_TURUTA,
} from './leadApp';

const app = url => ({
  id: 1,
  title: 'Ficha del lead',
  content: [{ type: 'frame', url }],
});

const ORDEN_CHATWOOT = [
  'conversation_actions',
  'macros',
  'conversation_info',
  'contact_attributes',
  'contact_notes',
  'shared_files',
  'previous_conversation',
  'conversation_participants',
  'linear_issues',
  'shopify_orders',
];

describe('isLeadApp', () => {
  it('reconoce la nuestra por la ruta, con o sin barra final', () => {
    expect(isLeadApp(app('https://api.x.com/dashboard-app?token=abc'))).toBe(
      true
    );
    expect(isLeadApp(app('https://api.x.com/dashboard-app/?token=abc'))).toBe(
      true
    );
  });

  it('ignora otras dashboard apps y datos rotos', () => {
    expect(isLeadApp(app('https://otra.com/panel'))).toBe(false);
    expect(isLeadApp(app('no-es-una-url'))).toBe(false);
    expect(isLeadApp({ content: [] })).toBe(false);
    expect(isLeadApp(null)).toBe(false);
  });
});

describe('leadAppConfig', () => {
  it('saca el origen y el token de la URL', () => {
    const apps = [
      app('https://otra.com/panel'),
      app('https://api.x.com/dashboard-app?token=abc'),
    ];
    expect(leadAppConfig(apps)).toEqual({
      api: 'https://api.x.com',
      token: 'abc',
    });
  });

  it('devuelve null si la cuenta no la tiene', () => {
    expect(leadAppConfig([])).toBeNull();
    expect(leadAppConfig(undefined)).toBeNull();
  });
});

describe('withLeadItems', () => {
  const nombres = list => list.map(i => i.name);

  it('da nuestro orden a quien nunca reordeno, con el historial al final', () => {
    const order = ORDEN_CHATWOOT.map(name => ({ name }));
    const result = nombres(withLeadItems(order));
    expect(result).toEqual(ORDEN_TURUTA);
    expect(result[result.length - 1]).toBe(LEAD_SIDEBAR_ITEM);
    expect(result[0]).toBe('conversation_actions');
  });

  it('respeta el orden de quien ya lo movio y solo anade el historial al final', () => {
    const order = [{ name: 'macros' }, { name: 'conversation_actions' }];
    expect(nombres(withLeadItems(order))).toEqual([
      'macros',
      'conversation_actions',
      LEAD_SIDEBAR_ITEM,
    ]);
  });

  it('no duplica el historial si ya estaba', () => {
    const order = [{ name: LEAD_SIDEBAR_ITEM }, { name: 'macros' }];
    expect(withLeadItems(order)).toEqual(order);
  });

  it('quita la seccion antigua "turuta_lead" de 4.17.1-3', () => {
    const order = [{ name: 'turuta_lead' }, { name: 'macros' }];
    expect(nombres(withLeadItems(order))).toEqual([
      'macros',
      LEAD_SIDEBAR_ITEM,
    ]);
  });

  it('no muta el orden original y aguanta basura', () => {
    const order = [{ name: 'macros' }, null, {}];
    const result = withLeadItems(order);
    expect(order).toHaveLength(3);
    expect(nombres(result)).toEqual(['macros', LEAD_SIDEBAR_ITEM]);
    expect(nombres(withLeadItems(undefined))).toEqual([LEAD_SIDEBAR_ITEM]);
  });
});

describe('cuando', () => {
  const now = new Date('2026-09-16T20:00:00Z').getTime();

  it('hoy, ayer, hace N dias, y fecha para lo viejo', () => {
    expect(cuando('2026-09-16T15:00:00Z', now)).toMatch(/^hoy /);
    expect(cuando('2026-09-15T15:00:00Z', now)).toMatch(/^ayer /);
    expect(cuando('2026-09-10T15:00:00Z', now)).toMatch(/^hace 6 dias, /);
    expect(cuando('2026-06-01T15:00:00Z', now)).not.toMatch(/^(hoy|ayer|hace)/);
  });

  it('no revienta con una fecha invalida', () => {
    expect(cuando('nada', now)).toBe('');
  });
});

describe('visita', () => {
  it('los inputs de fecha y hora van y vuelven en hora local', () => {
    const iso = isoDesdeInputs('2026-09-19', '16:00');
    expect(iso).toBeTruthy();
    expect(fechaInput(iso)).toBe('2026-09-19');
    expect(horaInput(iso)).toBe('16:00');
    expect(isoDesdeInputs('', '16:00')).toBeNull();
    expect(isoDesdeInputs('2026-09-19', '')).toBeNull();
  });

  it('cuandoVisita dice hoy, manana o la fecha', () => {
    const now = new Date(2026, 8, 19, 10, 0).getTime();
    expect(cuandoVisita(new Date(2026, 8, 19, 16, 0), now)).toMatch(
      /^hoy 4:00 p/
    );
    expect(cuandoVisita(new Date(2026, 8, 20, 9, 30), now)).toMatch(
      /^mañana 9:30 a/
    );
    expect(cuandoVisita(new Date(2026, 8, 25, 16, 0), now)).toMatch(
      /25.*se[pt].*4:00 p/
    );
    expect(cuandoVisita('nada', now)).toBe('');
  });

  it('textoVisita resume el estado', () => {
    expect(textoVisita({ status: 'CONFIRMED' })).toMatch(/Confirmada/);
    expect(textoVisita({ status: 'RESCHEDULE_REQUESTED' })).toMatch(
      /reprogramar/
    );
    expect(
      textoVisita({ status: 'SCHEDULED', reminderStatus: 'PENDING' })
    ).toMatch(/2 h antes/);
    expect(
      textoVisita({ status: 'SCHEDULED', reminderStatus: 'SENT' })
    ).toMatch(/enviado/);
    expect(
      textoVisita({
        status: 'SCHEDULED',
        reminderStatus: 'FAILED',
        reminderError: 'x',
      })
    ).toMatch(/fallo: x/);
    expect(textoVisita(null)).toBe('');
  });
});
