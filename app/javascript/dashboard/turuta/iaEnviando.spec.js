import {
  CLAVE_IA_ENVIANDO,
  iaEnviando,
  iaEnviandoPorMensajes,
} from './iaEnviando';

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

describe('iaEnviandoPorMensajes', () => {
  const ahora = Date.parse('2026-10-22T20:00:00Z');
  const seg = s => ahora / 1000 - s;
  const ia = (hace, extra = {}) => ({
    message_type: 1,
    private: false,
    sender: { type: 'agent_bot' },
    created_at: seg(hace),
    status: 'sent',
    attachments: [],
    ...extra,
  });
  const pdf = hace => ia(hace, { attachments: [{ file_type: 'file' }] });

  it('un archivo de la IA que aun no llega: si', () => {
    expect(iaEnviandoPorMensajes([ia(30), pdf(20)], ahora)).toBe(true);
  });

  it('entre un archivo y el siguiente (el ultimo ya llego, pero es de hace nada): si', () => {
    expect(
      iaEnviandoPorMensajes([pdf(5), { ...pdf(3), status: 'delivered' }], ahora)
    ).toBe(true);
  });

  it('todo llego hace rato, o el ultimo es de una persona: no', () => {
    expect(
      iaEnviandoPorMensajes([{ ...pdf(30), status: 'delivered' }], ahora)
    ).toBe(false);
    const asesor = {
      message_type: 1,
      private: false,
      sender: { type: 'user' },
      created_at: seg(1),
    };
    expect(iaEnviandoPorMensajes([pdf(5), asesor], ahora)).toBe(false);
  });

  it('una respuesta de texto de la IA, sin archivos: no es una ficha', () => {
    expect(iaEnviandoPorMensajes([ia(2)], ahora)).toBe(false);
    expect(iaEnviandoPorMensajes([], ahora)).toBe(false);
    expect(iaEnviandoPorMensajes(undefined, ahora)).toBe(false);
  });
});
