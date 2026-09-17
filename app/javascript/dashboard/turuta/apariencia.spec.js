import { describe, it, expect, beforeEach, vi } from 'vitest';
import { temaActual, ponerTema } from './apariencia';

const sistema = oscuro => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: oscuro });
};

describe('apariencia', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark');
    sistema(false);
  });

  it('sin elegir nada, manda el sistema', () => {
    expect(temaActual()).toBe('auto');
  });

  it('oscuro: se guarda y se aplica al momento', () => {
    ponerTema('dark');
    expect(temaActual()).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('claro gana aunque el sistema este en oscuro', () => {
    sistema(true);
    ponerTema('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('sistema: sigue al sistema', () => {
    sistema(true);
    ponerTema('auto');
    expect(temaActual()).toBe('auto');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('un valor desconocido no cambia nada', () => {
    ponerTema('dark');
    ponerTema('rosa');
    expect(temaActual()).toBe('dark');
  });
});
