import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { abrirConTope, TOPE_MS } from './abrirConTope';

describe('abrirConTope', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve la base si abre a tiempo', async () => {
    const db = { name: 'cw-store-1', close: vi.fn() };
    await expect(abrirConTope(Promise.resolve(db))).resolves.toBe(db);
    expect(db.close).not.toHaveBeenCalled();
  });

  it('si no abre nunca, falla al llegar al tope en vez de colgarse', async () => {
    const nunca = new Promise(() => {});
    const intento = abrirConTope(nunca);
    const comprobacion = expect(intento).rejects.toThrow(/no responde/);
    await vi.advanceTimersByTimeAsync(TOPE_MS + 1);
    await comprobacion;
  });

  it('si abre tarde, cierra esa conexion para que no bloquee a nadie', async () => {
    const db = { close: vi.fn() };
    let abrir;
    const tarde = new Promise(resolve => {
      abrir = resolve;
    });
    const intento = abrirConTope(tarde);
    const comprobacion = expect(intento).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(TOPE_MS + 1);
    await comprobacion;

    abrir(db);
    await vi.advanceTimersByTimeAsync(0);
    expect(db.close).toHaveBeenCalledTimes(1);
  });

  it('propaga el error de apertura tal cual', async () => {
    const roto = Promise.reject(new Error('sin IndexedDB'));
    await expect(abrirConTope(roto)).rejects.toThrow('sin IndexedDB');
  });
});
