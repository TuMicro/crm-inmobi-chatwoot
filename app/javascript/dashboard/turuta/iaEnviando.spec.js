import { CLAVE_IA_ENVIANDO, iaEnviando } from './iaEnviando';

describe('iaEnviando', () => {
  const ahora = Date.parse('2026-10-02T21:00:00Z');
  const chat = hasta => ({ custom_attributes: { [CLAVE_IA_ENVIANDO]: hasta } });

  it('mientras no pase la hora que marco la API', () => {
    expect(iaEnviando(chat('2026-10-02T21:02:00Z'), ahora)).toBe(true);
    expect(iaEnviando(chat('2026-10-02T20:59:00Z'), ahora)).toBe(false);
  });

  it('sin marca, borrada o rara, no', () => {
    expect(iaEnviando(chat(null), ahora)).toBe(false);
    expect(iaEnviando(chat('x'), ahora)).toBe(false);
    expect(iaEnviando({}, ahora)).toBe(false);
    expect(iaEnviando(undefined, ahora)).toBe(false);
  });
});
