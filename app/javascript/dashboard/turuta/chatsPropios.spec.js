import { describe, it, expect, afterEach } from 'vitest';
import {
  agentesVenTodo,
  esAgenteRestringido,
  esMioOSinAsignar,
  puedeVerChat,
  pestanaVisible,
} from './chatsPropios';
import { applyRoleFilter } from 'dashboard/store/modules/conversations/helpers';

const mio = { meta: { assignee: { id: 7 } } };
const ajeno = { meta: { assignee: { id: 8 } } };
const libre = { meta: {} };

describe('chatsPropios', () => {
  afterEach(() => {
    delete window.globalConfig;
  });

  it('un agente ve lo suyo y lo que esta sin asignar, y nada mas', () => {
    expect(puedeVerChat(mio, 'agent', 7)).toBe(true);
    expect(puedeVerChat(libre, 'agent', 7)).toBe(true);
    expect(puedeVerChat(ajeno, 'agent', 7)).toBe(false);
  });

  it('un administrador lo ve todo', () => {
    expect(puedeVerChat(ajeno, 'administrator', 7)).toBe(true);
    expect(esAgenteRestringido('administrator')).toBe(false);
  });

  it('los roles personalizados se quedan como en Chatwoot', () => {
    expect(esAgenteRestringido('custom_role')).toBe(false);
  });

  it('un chat que atiende la IA no es de nadie ni esta sin asignar', () => {
    expect(
      esMioOSinAsignar({ meta: { assignee: { id: 7, type: 'agent_bot' } } }, 7)
    ).toBe(false);
    expect(
      esMioOSinAsignar(
        { meta: { assignee: { id: 7 }, assignee_type: 'AgentBot' } },
        7
      )
    ).toBe(false);
    expect(
      puedeVerChat(
        { meta: { assignee: { id: 7, type: 'agent_bot' } } },
        'agent',
        7
      )
    ).toBe(false);
    expect(
      puedeVerChat(
        { meta: { assignee: { id: 7, type: 'agent_bot' } } },
        'administrator',
        7
      )
    ).toBe(true);
  });

  it('sin datos de asignacion cuenta como sin asignar', () => {
    expect(esMioOSinAsignar({}, 7)).toBe(true);
    expect(esMioOSinAsignar({ meta: { assignee: null } }, 7)).toBe(true);
  });

  it('la pestana Todos sobra para un agente, no para un administrador', () => {
    expect(pestanaVisible('all', 'agent')).toBe(false);
    expect(pestanaVisible('me', 'agent')).toBe(true);
    expect(pestanaVisible('unassigned', 'agent')).toBe(true);
    expect(pestanaVisible('all', 'administrator')).toBe(true);
  });

  it('TURUTA_AGENTS_SEE_ALL devuelve el comportamiento de Chatwoot', () => {
    window.globalConfig = { TURUTA_AGENTS_SEE_ALL: 'true' };
    expect(agentesVenTodo()).toBe(true);
    expect(puedeVerChat(ajeno, 'agent', 7)).toBe(true);
    expect(pestanaVisible('all', 'agent')).toBe(true);
  });

  it('el filtro por rol del almacen aplica la regla', () => {
    expect(applyRoleFilter(mio, 'agent', ['agent'], 7)).toBe(true);
    expect(applyRoleFilter(libre, 'agent', ['agent'], 7)).toBe(true);
    expect(applyRoleFilter(ajeno, 'agent', ['agent'], 7)).toBe(false);
    expect(applyRoleFilter(ajeno, 'administrator', ['administrator'], 7)).toBe(
      true
    );
  });
});
