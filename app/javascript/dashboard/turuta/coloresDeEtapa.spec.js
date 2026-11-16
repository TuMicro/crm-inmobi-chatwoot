import { describe, it, expect } from 'vitest';
import {
  CONTRASTE_MINIMO,
  NINGUNO,
  PALETA,
  TEMAS,
  ALFA_TOPE,
  alfaCon,
  alfaLegible,
  intensidadEfectiva,
  legibleCon,
  normalizarIntensidad,
  cambiosDelEquipo,
  colorDeEtapa,
  coloresDelEquipo,
  contraste,
  mezclar,
  mismosPropios,
  normalizarColor,
  propiosParaGuardar,
  tinte,
} from './coloresDeEtapa';

describe('lo que se guarda desde las pantallas', () => {
  const etapas = [
    { codigo: 'nurturing', nombre: 'En seguimiento', color: '#F2C230' },
    { codigo: 'cierre', nombre: 'Cierre', color: null },
  ];

  it('los del equipo, por codigo', () => {
    expect(coloresDelEquipo(etapas)).toEqual({
      nurturing: '#F2C230',
      cierre: null,
    });
  });

  it('Ajustes manda solo lo que cambio, y quitar un color tambien cuenta', () => {
    const guardado = coloresDelEquipo(etapas);
    expect(
      cambiosDelEquipo({ nurturing: '#f2c230', cierre: null }, guardado)
    ).toEqual({});
    expect(
      cambiosDelEquipo({ nurturing: null, cierre: '#16883F' }, guardado)
    ).toEqual({
      nurturing: null,
      cierre: '#16883F',
    });
  });

  it('los propios: colores validos o "ninguno"; lo demas no se guarda', () => {
    expect(
      propiosParaGuardar({
        nurturing: '#3b82f6',
        cierre: NINGUNO,
        separacion: 'verde',
      })
    ).toEqual({ nurturing: '#3B82F6', cierre: NINGUNO });
  });

  it('dos juegos de propios iguales aunque se escriban distinto', () => {
    expect(
      mismosPropios({ nurturing: '#3b82f6' }, { nurturing: '#3B82F6' })
    ).toBe(true);
    expect(mismosPropios({ nurturing: '#3B82F6' }, {})).toBe(false);
    expect(mismosPropios({}, undefined)).toBe(true);
  });
});

describe('normalizarColor', () => {
  it('#RRGGBB en mayusculas, como la API', () => {
    expect(normalizarColor('#f2c230')).toBe('#F2C230');
    expect(normalizarColor('a3e635')).toBe('#A3E635');
    expect(normalizarColor('#abc')).toBe('#AABBCC');
  });

  it('sin color: null; lo que no es un color: undefined', () => {
    expect(normalizarColor(null)).toBeNull();
    expect(normalizarColor(NINGUNO)).toBeNull();
    expect(normalizarColor('verde')).toBeUndefined();
    expect(normalizarColor(undefined)).toBeUndefined();
  });
});

describe('colorDeEtapa', () => {
  const equipo = { nurturing: '#F2C230', separacion: '#16883F' };

  it('sin color propio, el del equipo', () => {
    expect(colorDeEtapa('nurturing', equipo, {})).toBe('#F2C230');
    expect(colorDeEtapa('nurturing', equipo, undefined)).toBe('#F2C230');
  });

  it('el propio manda sobre el del equipo', () => {
    expect(colorDeEtapa('nurturing', equipo, { nurturing: '#3b82f6' })).toBe(
      '#3B82F6'
    );
  });

  it('"ninguno" quita el color solo para esa persona', () => {
    expect(
      colorDeEtapa('separacion', equipo, { separacion: NINGUNO })
    ).toBeNull();
  });

  it('un color propio estropeado no tapa el del equipo', () => {
    expect(colorDeEtapa('separacion', equipo, { separacion: 'verde' })).toBe(
      '#16883F'
    );
  });

  it('una etapa sin color en ningun sitio, o un chat sin etapa: nada', () => {
    expect(colorDeEtapa('cierre', equipo, {})).toBeNull();
    expect(colorDeEtapa(undefined, equipo, {})).toBeNull();
  });

  it('va por el codigo de la etapa: renombrarla no le quita el color', () => {
    // El chat trae crm_stage (codigo) y crm_stage_name (nombre); solo cuenta el primero.
    const chat = {
      crm_stage: 'separacion',
      crm_stage_name: 'Separación (renombrada)',
    };
    expect(colorDeEtapa(chat.crm_stage, equipo, {})).toBe('#16883F');
  });
});

describe('contraste del texto sobre el tinte', () => {
  it('la formula de WCAG: negro sobre blanco es 21', () => {
    expect(contraste([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });

  Object.entries(TEMAS).forEach(([tema, t]) => {
    it(`tema ${tema}: cada color de la paleta se ve y deja leer el texto`, () => {
      PALETA.forEach(({ color }) => {
        const n = normalizarColor(color);
        const c = [1, 3, 5].map(i => parseInt(n.slice(i, i + 2), 16));
        [t.alfa, t.alfaFuerte].forEach(maximo => {
          const alfa = alfaLegible(color, tema, maximo);
          expect(alfa).toBeGreaterThanOrEqual(0.15);
          expect(alfa).toBeLessThanOrEqual(maximo);
          expect(
            contraste(t.texto, mezclar(t.fondo, c, alfa))
          ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
        });
      });
    });
  });

  it('un color muy oscuro en tema claro se aclara solo, sin perder lectura', () => {
    const alfa = alfaLegible('#000000', 'claro', TEMAS.claro.alfa);
    expect(alfa).toBeGreaterThan(0);
    expect(alfa).toBeLessThan(TEMAS.claro.alfa);
    expect(
      contraste(TEMAS.claro.texto, mezclar(TEMAS.claro.fondo, [0, 0, 0], alfa))
    ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });

  it('y uno muy claro en tema oscuro, igual', () => {
    const alfa = alfaLegible('#FFFFFF', 'oscuro', TEMAS.oscuro.alfaFuerte);
    expect(alfa).toBeLessThan(TEMAS.oscuro.alfaFuerte);
    expect(
      contraste(
        TEMAS.oscuro.texto,
        mezclar(TEMAS.oscuro.fondo, [255, 255, 255], alfa)
      )
    ).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });
});

describe('tinte', () => {
  it('las variables de los dos temas y el borde del chat abierto', () => {
    const t = tinte('#16883f');
    expect(Object.keys(t).sort()).toEqual([
      '--te-borde',
      '--te-claro',
      '--te-claro-fuerte',
      '--te-oscuro',
      '--te-oscuro-fuerte',
    ]);
    expect(t['--te-borde']).toBe('#16883F');
    expect(t['--te-claro']).toMatch(/^rgba\(22, 136, 63, 0\.\d+\)$/);
  });

  it('se calcula una vez por color', () => {
    expect(tinte('#F2C230')).toBe(tinte('#f2c230'));
  });

  it('sin color, nada', () => {
    expect(tinte(null)).toEqual({});
  });
});

describe('intensidad (17/11)', () => {
  it('de 0.5 a 2, redondeada; 1 y null son la de por defecto', () => {
    expect(normalizarIntensidad(1.5)).toBe(1.5);
    expect(normalizarIntensidad('0.75')).toBe(0.75);
    expect(normalizarIntensidad(1)).toBeNull();
    expect(normalizarIntensidad(null)).toBeNull();
    expect(normalizarIntensidad(3)).toBeUndefined();
    expect(normalizarIntensidad('fuerte')).toBeUndefined();
  });

  it('manda la propia; si no, la del equipo; si no, 1', () => {
    expect(intensidadEfectiva(1.5, 0.75)).toBe(1.5);
    expect(intensidadEfectiva(null, 0.75)).toBe(0.75);
    expect(intensidadEfectiva(undefined, null)).toBe(1);
    expect(intensidadEfectiva('nada', 2)).toBe(2);
  });

  it('multiplica la transparencia legible, con un tope', () => {
    const base = alfaLegible('#16883F', 'claro', TEMAS.claro.alfa);
    expect(alfaCon('#16883F', 'claro', TEMAS.claro.alfa, 1)).toBe(base);
    expect(alfaCon('#16883F', 'claro', TEMAS.claro.alfa, 0.5)).toBeCloseTo(
      base / 2,
      2
    );
    expect(alfaCon('#16883F', 'claro', TEMAS.claro.alfa, 2)).toBeCloseTo(
      base * 2,
      2
    );
    expect(alfaCon('#F2C230', 'claro', 0.5, 2)).toBe(ALFA_TOPE);
  });

  it('con la de por defecto o mas suave, todo se lee; mas fuerte, no siempre', () => {
    PALETA.forEach(({ color }) => {
      expect(legibleCon(color, 1)).toBe(true);
      expect(legibleCon(color, 0.5)).toBe(true);
    });
    expect(legibleCon('#16883F', 2)).toBe(false);
    expect(legibleCon(null, 2)).toBe(true);
  });

  it('el tinte cambia con la intensidad y se guarda por color e intensidad', () => {
    const normal = tinte('#16883F');
    const fuerte = tinte('#16883F', 2);
    expect(fuerte).not.toEqual(normal);
    expect(tinte('#16883f', 2)).toBe(fuerte);
    expect(fuerte['--te-borde']).toBe('#16883F');
  });
});
