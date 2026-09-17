import { describe, it, expect } from 'vitest';
import {
  minutosHastaFinDelDia,
  peticionDeDescanso,
  textoDescanso,
} from './descanso';

// Fechas en la hora LOCAL de quien corre la prueba, igual que en el navegador.
const ahora = new Date(2026, 8, 18, 15, 0, 0);

describe('minutosHastaFinDelDia', () => {
  it('cuenta hasta las 23:59', () => {
    expect(minutosHastaFinDelDia(ahora)).toBe(8 * 60 + 59);
  });

  it('nunca da cero: a las 23:59 queda un minuto', () => {
    expect(minutosHastaFinDelDia(new Date(2026, 8, 18, 23, 59, 30))).toBe(1);
  });
});

describe('peticionDeDescanso', () => {
  it('minutos cerrados', () => {
    expect(peticionDeDescanso(30, ahora)).toEqual({ minutos: 30 });
    expect(peticionDeDescanso('120', ahora)).toEqual({ minutos: 120 });
  });

  it('resto del dia', () => {
    expect(peticionDeDescanso('hoy', ahora)).toEqual({ minutos: 539 });
  });

  it('sin hora de vuelta', () => {
    expect(peticionDeDescanso('indefinido', ahora)).toEqual({
      indefinido: true,
    });
  });
});

describe('textoDescanso', () => {
  it('vacio si no hay descanso', () => {
    expect(textoDescanso(undefined, ahora)).toBe('');
    expect(textoDescanso({ enDescanso: false }, ahora)).toBe('');
  });

  it('hoy: solo la hora, en 24 h', () => {
    const hasta = new Date(2026, 8, 18, 16, 30).toISOString();
    expect(textoDescanso({ enDescanso: true, hasta }, ahora)).toBe(
      'En descanso hasta las 16:30'
    );
  });

  it('otro dia: dia y hora', () => {
    const hasta = new Date(2026, 8, 20, 9, 0).toISOString();
    const texto = textoDescanso({ enDescanso: true, hasta }, ahora);
    expect(texto).toMatch(/^En descanso hasta el 20 /);
    expect(texto).toMatch(/09:00$/);
  });

  it('sin hora de vuelta', () => {
    expect(
      textoDescanso({ enDescanso: true, indefinido: true, hasta: null }, ahora)
    ).toBe('En pausa, sin hora de vuelta');
  });

  it('un descanso que ya vencio con la pagina abierta no se pinta', () => {
    const hasta = new Date(2026, 8, 18, 14, 0).toISOString();
    expect(textoDescanso({ enDescanso: true, hasta }, ahora)).toBe('');
  });
});
