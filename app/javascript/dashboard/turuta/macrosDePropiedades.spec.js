import { enlaceDeMacro, rutaDeLaPropiedad } from './macrosDePropiedades';

const enlaces = [
  {
    macroId: 12,
    site: 'joserojas',
    propertyId: 'p-1',
    nombre: 'JR-001 · Dúplex',
  },
];

describe('macros de propiedades', () => {
  it('el enlace de una macro, por su id (numero o texto)', () => {
    expect(enlaceDeMacro(enlaces, 12)?.nombre).toBe('JR-001 · Dúplex');
    expect(enlaceDeMacro(enlaces, '12')?.propertyId).toBe('p-1');
    expect(enlaceDeMacro(enlaces, 13)).toBe(null);
    expect(enlaceDeMacro(undefined, 12)).toBe(null);
  });

  it('lleva a Propiedades con esa propiedad abierta', () => {
    expect(rutaDeLaPropiedad(enlaces[0], 1)).toEqual({
      name: 'turuta_propiedades',
      params: { accountId: 1 },
      query: { propiedad: 'p-1' },
    });
  });
});
