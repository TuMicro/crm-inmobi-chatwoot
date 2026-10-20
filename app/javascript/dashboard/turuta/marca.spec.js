import { describe, it, expect } from 'vitest';
import { iconoParaFondoOscuro, nombreEnElMenu } from './marca';

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

describe('nombreEnElMenu', () => {
  it('con la marca de otro dominio, el de la marca', () => {
    expect(nombreEnElMenu({ TURUTA_NOMBRE_EN_MENU: 'Flyboard' })).toBe(
      'Flyboard'
    );
  });

  it('sin ella, vacio: el menu pone el nombre de la cuenta', () => {
    expect(nombreEnElMenu({})).toBe('');
    expect(nombreEnElMenu(undefined)).toBe('');
  });
});
