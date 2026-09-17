import { describe, it, expect } from 'vitest';
import {
  filasConBarra,
  filasPorEtapa,
  iniciales,
  intensidad,
  maximoDeLaTabla,
  ordenarAsesores,
  resumen,
  tipoDeEtapa,
} from './embudo';

const etapas = [
  { code: 'nuevo', name: 'Nuevo', total: 2 },
  { code: 'visita', name: 'Visita agendada', total: 4 },
  { code: 'cierre', name: 'Cierre', total: 3, terminal: true },
  {
    code: 'perdido',
    name: 'Perdido',
    total: 1,
    terminal: true,
    requiereMotivo: true,
  },
];

describe('tipoDeEtapa', () => {
  it('distingue ganada, perdida y abierta', () => {
    expect(etapas.map(tipoDeEtapa)).toEqual([
      'abierta',
      'abierta',
      'ganada',
      'perdida',
    ]);
  });
});

describe('resumen', () => {
  it('saca cerrados, perdidos y la tasa sobre los que tienen desenlace', () => {
    expect(resumen({ etapas, activos: 6, total: 10 })).toEqual({
      activos: 6,
      total: 10,
      cerrados: 3,
      perdidos: 1,
      tasaDeCierre: 75,
    });
  });

  it('sin desenlaces la tasa es null, no un 0 %', () => {
    const sinFinal = [{ code: 'nuevo', name: 'Nuevo', total: 5 }];
    expect(
      resumen({ etapas: sinFinal, activos: 5, total: 5 }).tasaDeCierre
    ).toBeNull();
  });

  it('sin datos no rompe', () => {
    expect(resumen(null)).toEqual({
      activos: 0,
      total: 0,
      cerrados: 0,
      perdidos: 0,
      tasaDeCierre: null,
    });
  });
});

describe('filasPorEtapa', () => {
  it('la etapa mas llena ocupa todo el ancho', () => {
    const filas = filasPorEtapa(etapas);
    expect(filas.map(f => f.ancho)).toEqual([50, 100, 75, 25]);
    expect(filas.map(f => f.parte)).toEqual([20, 40, 30, 10]);
    expect(filas[2].tipo).toBe('ganada');
  });

  it('con todo a cero no divide por cero', () => {
    const filas = filasPorEtapa([{ code: 'a', name: 'A', total: 0 }]);
    expect(filas[0]).toMatchObject({ ancho: 0, parte: 0 });
  });
});

describe('filasConBarra', () => {
  it('anade ancho y parte', () => {
    expect(
      filasConBarra([
        { nombre: 'Ana', total: 3 },
        { nombre: 'Beto', total: 1 },
      ]).map(f => [f.nombre, f.ancho, f.parte])
    ).toEqual([
      ['Ana', 100, 75],
      ['Beto', 33, 25],
    ]);
  });
});

describe('intensidad', () => {
  it('cero es vacia y el maximo es 4', () => {
    expect(intensidad(0, 8)).toBe(0);
    expect(intensidad(1, 8)).toBe(1);
    expect(intensidad(4, 8)).toBe(2);
    expect(intensidad(8, 8)).toBe(4);
    expect(intensidad(3, 0)).toBe(0);
  });
});

describe('maximoDeLaTabla', () => {
  it('mira las celdas, no el total de la fila', () => {
    expect(
      maximoDeLaTabla([
        { porEtapa: { a: 1, b: 5 }, total: 6 },
        { porEtapa: { a: 2, b: 0 }, total: 2 },
      ])
    ).toBe(5);
    expect(maximoDeLaTabla([])).toBe(0);
  });
});

describe('iniciales', () => {
  it('primera y ultima palabra', () => {
    expect(iniciales('Ana Cerradora')).toBe('AC');
    expect(iniciales('Luis  Todo Terreno')).toBe('LT');
    expect(iniciales('isaac')).toBe('IS');
    expect(iniciales('')).toBe('?');
  });
});

describe('ordenarAsesores', () => {
  it('mas leads primero, y "Sin asesor" siempre al final', () => {
    const r = ordenarAsesores([
      { id: null, nombre: 'Sin asesor', total: 9 },
      { id: 'b', nombre: 'Beto', total: 1 },
      { id: 'a', nombre: 'Ana', total: 1 },
      { id: 'c', nombre: 'Carla', total: 4 },
    ]).map(a => a.nombre);
    expect(r).toEqual(['Carla', 'Ana', 'Beto', 'Sin asesor']);
  });
});
