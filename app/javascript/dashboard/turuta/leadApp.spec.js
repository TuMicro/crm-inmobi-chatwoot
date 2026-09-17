import {
  isLeadApp,
  leadAppConfig,
  withLeadItem,
  cuando,
  LEAD_SIDEBAR_ITEM,
} from './leadApp';

const app = url => ({
  id: 1,
  title: 'Ficha del lead',
  content: [{ type: 'frame', url }],
});

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

describe('withLeadItem', () => {
  it('pone la seccion primera si el orden guardado no la tiene', () => {
    const order = [{ name: 'macros' }, { name: 'conversation_info' }];
    expect(withLeadItem(order).map(i => i.name)).toEqual([
      LEAD_SIDEBAR_ITEM,
      'macros',
      'conversation_info',
    ]);
  });

  it('respeta donde la dejo el asesor', () => {
    const order = [{ name: 'macros' }, { name: LEAD_SIDEBAR_ITEM }];
    expect(withLeadItem(order)).toEqual(order);
  });

  it('no muta el orden original', () => {
    const order = [{ name: 'macros' }];
    withLeadItem(order);
    expect(order).toHaveLength(1);
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
