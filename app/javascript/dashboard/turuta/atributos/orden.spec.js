import { conValorPrimero, tieneValor } from './orden';

describe('tieneValor', () => {
  it('vacio, espacios o lista vacia no es valor', () => {
    expect(tieneValor('')).toBe(false);
    expect(tieneValor('  ')).toBe(false);
    expect(tieneValor([])).toBe(false);
    expect(tieneValor(null)).toBe(false);
    expect(tieneValor(undefined)).toBe(false);
    expect(tieneValor('sí')).toBe(true);
    expect(tieneValor(['san isidro'])).toBe(true);
    expect(tieneValor(0)).toBe(true);
    expect(tieneValor(false)).toBe(true);
  });
});

describe('conValorPrimero', () => {
  const a = (key, value) => ({ type: 'custom_attribute', key, value });

  it('los que tienen valor arriba, en su orden; los fijos se quedan arriba', () => {
    const fijo = { type: 'static_attribute', key: 'static-browser' };
    const lista = [
      fijo,
      a('distritos', ['san isidro']),
      a('propiedad', ''),
      a('presupuesto', ''),
      a('forma_de_pago', 'recursos propios'),
      a('credito', ''),
      a('operacion', 'comprar'),
    ];
    expect(conValorPrimero(lista).map(e => e.key)).toEqual([
      'static-browser',
      'distritos',
      'forma_de_pago',
      'operacion',
      'propiedad',
      'presupuesto',
      'credito',
    ]);
    expect(conValorPrimero(undefined)).toEqual([]);
  });
});
