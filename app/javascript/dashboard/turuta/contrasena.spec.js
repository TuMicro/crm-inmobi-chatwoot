import { describe, it, expect } from 'vitest';
import { contrasenaValida, requisitos } from './contrasena';

const cumplidos = contrasena =>
  requisitos(contrasena)
    .filter(r => r.cumple)
    .map(r => r.id);

describe('requisitos', () => {
  it('vacia: no cumple ninguno, y no rompe con undefined', () => {
    expect(cumplidos('')).toEqual([]);
    expect(cumplidos(undefined)).toEqual([]);
  });

  it('marca cada requisito por separado', () => {
    expect(cumplidos('abc')).toEqual(['minuscula']);
    expect(cumplidos('ABCDEF')).toEqual(['largo', 'mayuscula']);
    expect(cumplidos('abc123')).toEqual(['largo', 'minuscula', 'numero']);
  });

  it('acepta los caracteres especiales que acepta el servidor', () => {
    ['!', '@', '#', '_', '-', '.', '?', '~', '/'].forEach(c => {
      expect(cumplidos('a' + c)).toContain('especial');
    });
    expect(cumplidos('a b')).not.toContain('especial');
  });
});

describe('contrasenaValida', () => {
  it('solo cuando se cumplen todos', () => {
    expect(contrasenaValida('Asesor2026!')).toBe(true);
    expect(contrasenaValida('Asesor2026')).toBe(false);
    expect(contrasenaValida('asesor2026!')).toBe(false);
    expect(contrasenaValida('A1!a')).toBe(false);
  });
});
