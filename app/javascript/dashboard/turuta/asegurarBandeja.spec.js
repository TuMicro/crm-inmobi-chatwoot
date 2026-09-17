import { describe, it, expect, beforeEach, vi } from 'vitest';
import { asegurarBandeja, olvidarIntentos } from './asegurarBandeja';

const tienda = bandejas => ({
  getters: { 'inboxes/getInbox': id => bandejas[id] || {} },
  dispatch: vi.fn(),
});

describe('asegurarBandeja', () => {
  beforeEach(olvidarIntentos);

  it('no hace nada si la bandeja ya esta cargada', () => {
    const store = tienda({ 3: { id: 3 } });
    expect(asegurarBandeja(store, 3)).toBe(false);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('pide la lista si la bandeja del chat no esta', () => {
    const store = tienda({});
    expect(asegurarBandeja(store, 3, 1000)).toBe(true);
    expect(store.dispatch).toHaveBeenCalledWith('inboxes/get');
  });

  it('no insiste antes de un minuto, y despues si', () => {
    const store = tienda({});
    asegurarBandeja(store, 3, 1000);
    expect(asegurarBandeja(store, 3, 30000)).toBe(false);
    expect(asegurarBandeja(store, 3, 62000)).toBe(true);
    expect(store.dispatch).toHaveBeenCalledTimes(2);
  });

  it('cada bandeja lleva su propia cuenta', () => {
    const store = tienda({});
    asegurarBandeja(store, 3, 1000);
    expect(asegurarBandeja(store, 4, 1000)).toBe(true);
  });

  it('sin chat abierto no pide nada', () => {
    const store = tienda({});
    expect(asegurarBandeja(store, undefined)).toBe(false);
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
