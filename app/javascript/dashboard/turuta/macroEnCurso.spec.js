import { describe, it, expect } from 'vitest';
import {
  enviadosDesde,
  enviosDe,
  estadoDeLaMacro,
  topeMs,
} from './macroEnCurso';

const INICIO = 1_800_000_000_000;
const SEG = Math.floor(INICIO / 1000);

const saliente = (extra = {}) => ({
  message_type: 1,
  private: false,
  created_at: SEG + 1,
  sender: { id: 7 },
  ...extra,
});

describe('enviosDe', () => {
  it('cuenta solo lo que llega al cliente', () => {
    expect(
      enviosDe({
        actions: [
          { action_name: 'send_attachment' },
          { action_name: 'add_label' },
          { action_name: 'send_message' },
          { action_name: 'add_private_note' },
        ],
      })
    ).toBe(2);
  });

  it('sin acciones, cero', () => {
    expect(enviosDe({})).toBe(0);
    expect(enviosDe(undefined)).toBe(0);
  });
});

describe('enviadosDesde', () => {
  const filtro = { desdeMs: INICIO, usuarioId: 7 };

  it('deja fuera entrantes, notas privadas, lo anterior y lo de otro agente', () => {
    const mensajes = [
      saliente(),
      saliente({ message_type: 0 }),
      saliente({ private: true }),
      saliente({ created_at: SEG - 60 }),
      saliente({ sender: { id: 9 } }),
    ];
    expect(enviadosDesde(mensajes, filtro)).toHaveLength(1);
  });

  it('tolera unos segundos de desfase del reloj', () => {
    expect(
      enviadosDesde([saliente({ created_at: SEG - 3 })], filtro)
    ).toHaveLength(1);
  });

  it('sin lista, vacio', () => {
    expect(enviadosDesde(undefined, filtro)).toEqual([]);
  });
});

describe('estadoDeLaMacro', () => {
  const base = { esperados: 2, inicioMs: INICIO, ultimoVistoMs: null };

  it('espera mientras falten mensajes', () => {
    expect(
      estadoDeLaMacro({
        ...base,
        enviados: [saliente()],
        ahoraMs: INICIO + 3000,
      })
    ).toBe('esperando');
  });

  it('con todos en el chat, espera a que WhatsApp acepte el ultimo', () => {
    const enviados = [saliente({ source_id: 'wamid.1' }), saliente()];
    expect(
      estadoDeLaMacro({
        ...base,
        enviados,
        ahoraMs: INICIO + 5000,
        ultimoVistoMs: INICIO + 4000,
      })
    ).toBe('esperando');
  });

  it('termina cuando el ultimo tiene source_id, o fallo', () => {
    const ok = [saliente(), saliente({ source_id: 'wamid.2' })];
    const mal = [saliente(), saliente({ status: 'failed' })];
    expect(
      estadoDeLaMacro({ ...base, enviados: ok, ahoraMs: INICIO + 5000 })
    ).toBe('terminada');
    expect(
      estadoDeLaMacro({ ...base, enviados: mal, ahoraMs: INICIO + 5000 })
    ).toBe('terminada');
  });

  it('si WhatsApp no confirma, da el ultimo por enviado tras la gracia', () => {
    expect(
      estadoDeLaMacro({
        ...base,
        enviados: [saliente(), saliente()],
        ahoraMs: INICIO + 20000,
        ultimoVistoMs: INICIO + 10000,
      })
    ).toBe('terminada');
  });

  it('se rinde pasado el tope, sin afirmar que termino', () => {
    expect(
      estadoDeLaMacro({
        ...base,
        enviados: [],
        ahoraMs: INICIO + topeMs(2) + 1,
      })
    ).toBe('agotada');
  });
});
