import {
  avisoDelRecordatorio,
  horasValidas,
  momentoPorDefecto,
} from './recordatorio';

// Viernes 23/10/2026, 3:05 p. m. en Lima.
const VISITA = '2026-10-23T20:05:00Z';
const LUNES = new Date('2026-10-19T15:00:00Z');
const aviso = extra =>
  avisoDelRecordatorio({ visitaIso: VISITA, ahora: LUNES, ...extra });

describe('horasValidas', () => {
  it('enteros de 1 a 72', () => {
    expect(horasValidas(2)).toBe(2);
    expect(horasValidas('24')).toBe(24);
    [0, 73, 1.5, '', 'dos', null, undefined].forEach(malo =>
      expect(horasValidas(malo)).toBe(null)
    );
  });
});

describe('avisoDelRecordatorio', () => {
  it('dice cuando le llega, el mismo dia', () => {
    expect(aviso({ horas: 2 })).toEqual({
      error: false,
      texto: 'Le llegará el viernes 23, 1:05 p. m.',
    });
  });

  it('el dia anterior, solo si la plantilla del dia esta aprobada', () => {
    expect(aviso({ horas: 24, plantillaDelDia: true })).toEqual({
      error: false,
      texto: 'Le llegará el jueves 22, 3:05 p. m.',
    });
    const sinPlantilla = aviso({ horas: 24 });
    expect(sinPlantilla.error).toBe(true);
    expect(sinPlantilla.texto).toContain('saldría el día anterior');
  });

  it('cuenta los dias en la zona del tenant, no en la del navegador', () => {
    // 6 h antes de una visita a las 3:00 a. m. de Lima es el dia anterior.
    const madrugada = avisoDelRecordatorio({
      visitaIso: '2026-10-23T08:00:00Z',
      horas: 6,
      ahora: LUNES,
      zona: 'America/Lima',
    });
    expect(madrugada.error).toBe(true);
  });

  it('si la visita es antes de esas horas, no hay recordatorio (pero se puede guardar)', () => {
    const pronto = avisoDelRecordatorio({
      visitaIso: '2026-10-19T17:00:00Z',
      horas: 24,
      ahora: LUNES,
    });
    expect(pronto).toEqual({
      error: false,
      texto:
        'La visita es dentro de menos de 24 h: no se enviará recordatorio.',
    });
  });

  it('horas que no valen: error; sin fecha, nada', () => {
    expect(aviso({ horas: 100 })).toEqual({
      error: true,
      texto: 'Entre 1 y 72 horas.',
    });
    expect(avisoDelRecordatorio({ visitaIso: null, horas: 2 })).toBe(null);
  });
});

describe('avisoDelRecordatorio por dia y hora (06/11)', () => {
  // Jueves 22, 8:00 p. m. en Lima: la vispera de la visita.
  const VISPERA = '2026-10-23T01:00:00Z';

  it('el dia anterior a una hora exacta, con la plantilla del dia', () => {
    expect(aviso({ momentoIso: VISPERA, plantillaDelDia: true })).toEqual({
      error: false,
      texto: 'Le llegará el jueves 22, 8:00 p. m.',
    });
    const sinPlantilla = aviso({ momentoIso: VISPERA });
    expect(sinPlantilla.error).toBe(true);
    expect(sinPlantilla.texto).toContain('Elige una hora del mismo día');
  });

  it('el mismo dia no necesita la plantilla del dia', () => {
    expect(aviso({ momentoIso: '2026-10-23T14:00:00Z' })).toEqual({
      error: false,
      texto: 'Le llegará el viernes 23, 9:00 a. m.',
    });
  });

  it('las horas no cuentan: manda el dia y la hora', () => {
    expect(
      aviso({ momentoIso: '2026-10-23T14:00:00Z', horas: 100 }).error
    ).toBe(false);
  });

  it('sin elegir, ya pasada, o fuera de 1 a 72 h antes: error', () => {
    expect(aviso({ momentoIso: null })).toEqual({
      error: true,
      texto: 'Elige el día y la hora del recordatorio.',
    });
    expect(aviso({ momentoIso: '2026-10-19T14:00:00Z' }).texto).toBe(
      'Esa hora ya pasó.'
    );
    expect(aviso({ momentoIso: '2026-10-23T19:35:00Z' }).texto).toBe(
      'Tiene que salir al menos 1 h antes de la visita.'
    );
    expect(aviso({ momentoIso: '2026-10-19T19:00:00Z' }).texto).toBe(
      'Como mucho 72 h antes de la visita.'
    );
  });
});

describe('momentoPorDefecto', () => {
  // En la hora local de quien corre las pruebas, como el formulario.
  const visita = new Date(2026, 9, 23, 15, 5).toISOString();

  it('siempre la vispera a las 8:00 p. m.', () => {
    expect(momentoPorDefecto(visita)).toEqual({
      fecha: '2026-10-22',
      hora: '20:00',
    });
    // Visita el dia 1: la vispera es el ultimo del mes anterior.
    expect(
      momentoPorDefecto(new Date(2026, 10, 1, 9, 0).toISOString())
    ).toEqual({ fecha: '2026-10-31', hora: '20:00' });
  });

  it('sin visita, nada', () => {
    expect(momentoPorDefecto(null)).toBe(null);
  });
});
