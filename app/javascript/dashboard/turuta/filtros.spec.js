import { describe, it, expect } from 'vitest';
import { conEtapaPrimero, filaDeEtapa, ordenarFiltros, ETAPA } from './filtros';

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
  it('pone la etapa primero y las etiquetas despues', () => {
    const r = claves(ordenarFiltros(lista, { esAdmin: true }));
    expect(r).toEqual([ETAPA, 'labels', 'status', 'assignee_id', 'otro']);
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

describe('fila inicial del dialogo', () => {
  const definiciones = [
    { attribute_key: ETAPA, attribute_display_type: 'list' },
  ];

  it('propone la etapa, vacia, con forma de desplegable', () => {
    expect(filaDeEtapa(definiciones)).toEqual({
      attributeKey: ETAPA,
      filterOperator: 'equal_to',
      values: {},
      queryOperator: 'and',
    });
  });

  it('con el atributo aun como texto, el valor es un texto', () => {
    const texto = [{ attributeKey: ETAPA, attributeDisplayType: 'text' }];
    expect(filaDeEtapa(texto).values).toBe('');
  });

  it('sin el atributo en la cuenta no propone nada', () => {
    expect(filaDeEtapa([])).toBeNull();
    expect(filaDeEtapa(undefined)).toBeNull();
    const filas = [{ attributeKey: 'status' }];
    expect(conEtapaPrimero(filas, [])).toBe(filas);
  });

  it('va delante de las filas de contexto', () => {
    const filas = [{ attributeKey: 'status' }];
    const r = conEtapaPrimero(filas, definiciones);
    expect(r.map(f => f.attributeKey)).toEqual([ETAPA, 'status']);
  });

  it('no la repite si ya esta', () => {
    const filas = [{ attributeKey: ETAPA }];
    expect(conEtapaPrimero(filas, definiciones)).toBe(filas);
  });
});
