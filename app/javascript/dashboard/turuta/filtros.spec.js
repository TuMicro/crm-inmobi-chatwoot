import { describe, it, expect } from 'vitest';
import {
  filasAlAbrir,
  filaDeEtapa,
  filaDeEtapaSinCierre,
  ordenarFiltros,
  ETAPA,
} from './filtros';

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
  });
});

describe('filas al abrir el dialogo', () => {
  const definiciones = [
    {
      attribute_key: ETAPA,
      attribute_display_type: 'list',
      attribute_values: ['Nuevo', 'Contactado', 'Cierre', 'Perdido'],
    },
  ];
  it('etiquetas, vacia, y la etapa del lead no igual a Cierre', () => {
    expect(filasAlAbrir([], definiciones)).toEqual([
      {
        attributeKey: 'labels',
        filterOperator: 'equal_to',
        values: [],
        queryOperator: 'and',
      },
      {
        attributeKey: ETAPA,
        filterOperator: 'not_equal_to',
        values: { id: 'Cierre', name: 'Cierre' },
        queryOperator: 'and',
      },
    ]);
  });

  it('las de contexto de la vista se quedan detras', () => {
    const contexto = [{ attributeKey: 'inbox_id' }];
    expect(claves(filasAlAbrir(contexto, definiciones))).toEqual([
      'labels',
      ETAPA,
      'inbox_id',
    ]);
  });

  it('en una vista de etiqueta, la suya va en lugar de la vacia', () => {
    const deLaVista = { attributeKey: 'labels', values: [{ id: 'urgente' }] };
    const filas = filasAlAbrir([deLaVista], definiciones);
    expect(filas[0]).toBe(deLaVista);
    expect(claves(filas)).toEqual(['labels', ETAPA]);
  });

  it('sin una etapa llamada Cierre, la etapa vacia; sin el atributo, solo etiquetas', () => {
    const sinCierre = [{ ...definiciones[0], attribute_values: ['Nuevo'] }];
    expect(filaDeEtapaSinCierre(sinCierre)).toEqual(filaDeEtapa(sinCierre));
    expect(claves(filasAlAbrir([], []))).toEqual(['labels']);
  });

  it('con el atributo como texto, el valor es el texto', () => {
    const texto = [{ ...definiciones[0], attribute_display_type: 'text' }];
    expect(filaDeEtapaSinCierre(texto).values).toBe('Cierre');
  });
});
