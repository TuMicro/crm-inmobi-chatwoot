import {
  avisos,
  barrasPorDia,
  cambiosDe,
  cifras,
  dinero,
  etiquetaDeDia,
  formularioDe,
  hayCambios,
  motivos,
  textoMotivo,
} from './ia';

describe('dinero', () => {
  it('enseña los decimales que hacen falta', () => {
    expect(dinero(0)).toBe('$ 0');
    expect(dinero(0.0012)).toBe('$ 0.0012');
    expect(dinero(0.034)).toBe('$ 0.034');
    expect(dinero(12.5)).toBe('$ 12.50');
  });
});

describe('cifras', () => {
  it('calcula la tasa de calificados sobre los atendidos', () => {
    const c = cifras({ atendidos: 8, calificados: 2, visitas: 3, turnos: 40 });
    expect(c.tasa).toBe(25);
    expect(c.visitas).toBe(3);
  });

  it('sin leads atendidos no hay tasa, que no es lo mismo que 0 %', () => {
    expect(cifras({ atendidos: 0, calificados: 0 }).tasa).toBeNull();
    expect(cifras(null).turnos).toBe(0);
  });
});

describe('motivos', () => {
  it('traduce, ordena la barra por el mayor y marca los que siguen con la IA', () => {
    const m = motivos([
      { motivo: 'calificado', total: 4 },
      { motivo: 'pide_humano', total: 2 },
      { motivo: null, total: 9 },
    ]);
    expect(m.map(x => x.texto)).toEqual([
      'Calificados',
      'Pidieron hablar con alguien',
    ]);
    expect(m[0].ancho).toBe(100);
    expect(m[1].ancho).toBe(50);
    expect(m[0].sigue).toBe(true);
    expect(m[1].sigue).toBe(false);
  });

  it('un motivo que no conoce se enseña tal cual', () => {
    expect(textoMotivo('otra_cosa')).toBe('otra_cosa');
    expect(textoMotivo(null)).toBe('Sin motivo');
  });
});

describe('barrasPorDia', () => {
  it('da altura proporcional, con un minimo visible, y etiqueta corta', () => {
    const b = barrasPorDia([
      { dia: '2026-09-22', turnos: 0, costeUsd: 0 },
      { dia: '2026-09-23', turnos: 1, costeUsd: 0.01 },
      { dia: '2026-09-24', turnos: 20, costeUsd: 0.2 },
    ]);
    expect(b[0].alto).toBe(0);
    expect(b[1].alto).toBe(6);
    expect(b[2].alto).toBe(100);
    expect(b[2].etiqueta).toBe('24 set');
  });

  it('una fecha rara se enseña tal cual', () => {
    expect(etiquetaDeDia('ayer')).toBe('ayer');
  });
});

describe('la configuracion', () => {
  const config = {
    nombreEquipo: 'MadHouse',
    tono: 'tu',
    horario: null,
    maxTurnosSinAvance: 12,
  };

  it('el formulario sale de la configuracion, con los vacios como cadena', () => {
    const f = formularioDe(config);
    expect(f.nombreEquipo).toBe('MadHouse');
    expect(f.horario).toBe('');
    expect(f.maxTurnosSinAvance).toBe('12');
  });

  it('solo se manda lo que cambio, y vaciar un campo lo borra', () => {
    const f = formularioDe(config);
    expect(cambiosDe(f, config)).toEqual({});
    expect(hayCambios(f, config)).toBe(false);
    expect(cambiosDe({ ...f, horario: ' 9 a 19 ' }, config)).toEqual({
      horario: '9 a 19',
    });
    expect(cambiosDe({ ...f, nombreEquipo: '' }, config)).toEqual({
      nombreEquipo: '',
    });
    expect(cambiosDe({ ...f, maxTurnosSinAvance: '8' }, config)).toEqual({
      maxTurnosSinAvance: 8,
    });
  });
});

describe('avisos', () => {
  const ok = {
    aiMode: 'QUALIFY',
    inventarioConectado: true,
    sitios: ['madhouse'],
    bandejas: [{ chatwootInboxId: 1, nombre: 'MadHouse', ia: true }],
  };

  it('sin nada que avisar, la lista va vacia', () => {
    expect(avisos(ok)).toEqual([]);
  });

  it('apagada lo dice, y no se queja de lo demas', () => {
    expect(avisos({ ...ok, aiMode: 'OFF' })).toEqual([
      'La IA está apagada: los leads nuevos se reparten como siempre.',
    ]);
  });

  it('encendida sin bandejas, sin inventario o sin webs', () => {
    expect(avisos({ ...ok, bandejas: [{ ia: false }] })[0]).toMatch(
      /no atiende ninguna bandeja/
    );
    expect(avisos({ ...ok, inventarioConectado: false })[0]).toMatch(
      /no está conectado/
    );
    expect(avisos({ ...ok, sitios: [] })[0]).toMatch(/ninguna web elegida/);
  });
});
