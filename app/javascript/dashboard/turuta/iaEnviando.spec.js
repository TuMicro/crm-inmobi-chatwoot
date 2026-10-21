import {
  CLAVE_IA_ENVIANDO,
  iaEnviando,
  iaEnviandoPorMensajes,
  seguirEnvioDeLaIa,
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

describe('seguirEnvioDeLaIa: un aviso por ficha, y "terminó" una sola vez (23/10)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const montar = () => {
    const abrir = vi.fn();
    const cerrar = vi.fn();
    return {
      abrir,
      cerrar,
      aviso: seguirEnvioDeLaIa({ abrir, cerrar, espera: 15000 }),
    };
  };

  it('huecos entre archivos no lo cierran: se abre una vez y termina una vez', () => {
    const { abrir, cerrar, aviso } = montar();
    aviso.actualizar(true); // texto
    aviso.actualizar(false); // se sube el video
    vi.advanceTimersByTime(12000);
    aviso.actualizar(true); // sale el video
    aviso.actualizar(false);
    vi.advanceTimersByTime(5000);
    aviso.actualizar(true); // el PDF
    aviso.actualizar(false);
    vi.advanceTimersByTime(14999);
    expect(cerrar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(cerrar).toHaveBeenCalledWith(true);
  });

  it('repetir "no esta enviando" no alarga ni repite el final', () => {
    const { cerrar, aviso } = montar();
    aviso.actualizar(true);
    for (let i = 0; i < 20; i += 1) {
      aviso.actualizar(false);
      vi.advanceTimersByTime(1000);
    }
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('al cambiar de chat se cierra sin decir que termino; sin aviso abierto, nada', () => {
    const { cerrar, aviso } = montar();
    aviso.actualizar(false);
    vi.advanceTimersByTime(20000);
    expect(cerrar).not.toHaveBeenCalled();
    aviso.actualizar(true);
    aviso.cancelar();
    expect(cerrar).toHaveBeenCalledWith(false);
    vi.advanceTimersByTime(20000);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});
