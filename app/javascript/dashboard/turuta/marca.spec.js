import { describe, it, expect } from 'vitest';
import { iconoParaFondoOscuro } from './marca';

describe('iconoParaFondoOscuro', () => {
  it('devuelve el icono configurado', () => {
    const config = { LOGO_THUMBNAIL_DARK: '/brand-assets/blanco.png' };
    expect(iconoParaFondoOscuro(config)).toBe('/brand-assets/blanco.png');
  });

  it('sin configurar devuelve vacio, y el menu se queda con un solo icono', () => {
    expect(iconoParaFondoOscuro({})).toBe('');
    expect(iconoParaFondoOscuro(undefined)).toBe('');
    expect(iconoParaFondoOscuro({ LOGO_THUMBNAIL_DARK: null })).toBe('');
  });
});
