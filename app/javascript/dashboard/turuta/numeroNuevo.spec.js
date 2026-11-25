import { describe, it, expect } from 'vitest';
import { conPrefijoDePeru, pareceTelefono } from './numeroNuevo';

describe('conPrefijoDePeru', () => {
  it('el celular a secas gana su +51 en cuanto esta entero', () => {
    expect(conPrefijoDePeru('987654321')).toBe('+51987654321');
    expect(conPrefijoDePeru('987 654 321')).toBe('+51987654321');
    expect(conPrefijoDePeru('987-654-321')).toBe('+51987654321');
    expect(conPrefijoDePeru('51 987654321')).toBe('+51987654321');
  });

  it('a medio escribir no se toca', () => {
    expect(conPrefijoDePeru('98765432')).toBeNull();
    expect(conPrefijoDePeru('9')).toBeNull();
    expect(conPrefijoDePeru('')).toBeNull();
  });

  it('lo que ya trae su + es de quien lo escribio', () => {
    expect(conPrefijoDePeru('+51987654321')).toBeNull();
    expect(conPrefijoDePeru('+56912345678')).toBeNull();
  });

  it('un nombre o un correo no son un numero', () => {
    expect(conPrefijoDePeru('Ana 987654321')).toBeNull();
    expect(conPrefijoDePeru('ana987654321@x.com')).toBeNull();
    expect(conPrefijoDePeru(null)).toBeNull();
  });

  it('un fijo o un numero de otra forma se deja como esta', () => {
    expect(conPrefijoDePeru('014445566')).toBeNull();
    expect(conPrefijoDePeru('887654321')).toBeNull();
  });
});

describe('pareceTelefono', () => {
  it('lo que empieza por + o por un digito', () => {
    expect(pareceTelefono('+51')).toBe(true);
    expect(pareceTelefono('98')).toBe(true);
    expect(pareceTelefono('ana')).toBe(false);
    expect(pareceTelefono('')).toBe(false);
  });
});
