import { describe, it, expect } from 'vitest';
import { estadosDeChat, opcionDeEstadoVisible } from './estados';

describe('estadosDeChat', () => {
  it('un agente: abiertas, resueltas y todas; nunca pospuestas', () => {
    expect(estadosDeChat('agent')).toEqual(['open', 'resolved', 'all']);
  });

  it('el administrador ve ademas los chats con la IA', () => {
    expect(estadosDeChat('administrator')).toEqual([
      'open',
      'resolved',
      'pending',
      'all',
    ]);
  });

  it('filtra las opciones de Chatwoot por su value', () => {
    const opciones = ['open', 'resolved', 'pending', 'snoozed', 'all'].map(
      value => ({ value })
    );
    expect(
      opciones.filter(o => opcionDeEstadoVisible(o, 'agent')).map(o => o.value)
    ).toEqual(['open', 'resolved', 'all']);
    expect(
      opciones
        .filter(o => opcionDeEstadoVisible(o, 'administrator'))
        .map(o => o.value)
    ).toEqual(['open', 'resolved', 'pending', 'all']);
  });
});
