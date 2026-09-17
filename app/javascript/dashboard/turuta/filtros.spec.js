import { describe, it, expect } from 'vitest';
import { ordenarFiltros, ETAPA } from './filtros';

const lista = [
  { attributeKey: 'status', attributeModel: 'standard' },
  { attributeKey: 'priority', attributeModel: 'standard' },
  { attributeKey: 'assignee_id', attributeModel: 'standard' },
  { attributeKey: 'labels', attributeModel: 'standard' },
  { attributeKey: 'otro', attributeModel: 'conversation_attribute' },
  { attributeKey: ETAPA, attributeModel: 'conversation_attribute' },
];
const claves = l => l.map(f => f.attributeKey);

describe('ordenarFiltros', () => {
  it('pone etiquetas primero y la etapa despues', () => {
    const r = claves(ordenarFiltros(lista, { esAdmin: true }));
    expect(r).toEqual(['labels', ETAPA, 'status', 'assignee_id', 'otro']);
  });

  it('quita los filtros ocultos', () => {
    const r = claves(ordenarFiltros(lista, { esAdmin: true }));
    expect(r).not.toContain('priority');
  });

  it('el agente asignado solo lo ve un administrador', () => {
    const agente = claves(ordenarFiltros(lista, { esAdmin: false }));
    const admin = claves(ordenarFiltros(lista, { esAdmin: true }));
    expect(agente).not.toContain('assignee_id');
    expect(admin).toContain('assignee_id');
  });

  it('agrupa la etapa con los estandar sin tocar attributeModel', () => {
    const etapa = ordenarFiltros(lista, { esAdmin: true }).find(
      f => f.attributeKey === ETAPA
    );
    expect(etapa.grupoVisual).toBe('standard');
    expect(etapa.attributeModel).toBe('conversation_attribute');
  });
});
