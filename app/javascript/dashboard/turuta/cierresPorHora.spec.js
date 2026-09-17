import { describe, it, expect } from 'vitest';
import { cubosPorHora, textoDeCelda } from './cierresPorHora';

// Hora LOCAL de quien corre la prueba, igual que en el navegador.
const ahora = new Date(2026, 8, 17, 15, 30, 0);
const seg = fecha => Math.floor(fecha.getTime() / 1000);

describe('cubosPorHora', () => {
  it('da todas las horas del periodo, tambien las vacias', () => {
    const cubos = cubosPorHora([], 7, ahora);
    expect(cubos).toHaveLength(7 * 24);
    expect(cubos.every(c => c.value === 0)).toBe(true);
    expect(cubos[0].timestamp).toBe(seg(new Date(2026, 8, 11, 0, 0, 0)));
    expect(cubos[cubos.length - 1].timestamp).toBe(
      seg(new Date(2026, 8, 17, 23, 0, 0))
    );
  });

  it('cuenta cada cierre en su hora', () => {
    const cubos = cubosPorHora(
      [
        seg(new Date(2026, 8, 16, 10, 5)),
        seg(new Date(2026, 8, 16, 10, 55)),
        seg(new Date(2026, 8, 17, 9, 0)),
      ],
      7,
      ahora
    );
    const en = fecha => cubos.find(c => c.timestamp === seg(fecha)).value;
    expect(en(new Date(2026, 8, 16, 10, 0))).toBe(2);
    expect(en(new Date(2026, 8, 17, 9, 0))).toBe(1);
    expect(cubos.reduce((n, c) => n + c.value, 0)).toBe(3);
  });

  it('deja fuera lo anterior al periodo', () => {
    const cubos = cubosPorHora([seg(new Date(2026, 8, 1, 10, 0))], 7, ahora);
    expect(cubos.reduce((n, c) => n + c.value, 0)).toBe(0);
  });

  it('sin lista no rompe', () => {
    expect(cubosPorHora(undefined, 7, ahora)).toHaveLength(168);
  });
});

describe('textoDeCelda', () => {
  it('singular, plural y vacio', () => {
    expect(textoDeCelda(0)).toBe('Sin cierres');
    expect(textoDeCelda(1)).toBe('1 cierre');
    expect(textoDeCelda(4)).toBe('4 cierres');
  });
});
