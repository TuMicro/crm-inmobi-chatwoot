import { describe, it, expect } from 'vitest';
import {
  PREFIJO_CONTACTO,
  GRUPO_CONTACTO,
  esClaveDeContacto,
  claveReal,
  comoFiltrosDeContacto,
  definicionesDeContacto,
  valorDeContacto,
} from './filtrosDeContacto';
import { matchesFilters } from 'dashboard/store/modules/conversations/helpers/filterHelpers';
import { groupFilterTypes } from 'dashboard/components-next/filter/helper/filterAttributeIcons';

const chat = atributos => ({
  id: 1,
  custom_attributes: { distrito: 'Del chat' },
  meta: { sender: { id: 7, custom_attributes: atributos } },
});

describe('claves de contacto', () => {
  it('se reconocen por el prefijo', () => {
    expect(esClaveDeContacto('contact_attribute:distrito')).toBe(true);
    expect(esClaveDeContacto('distrito')).toBe(false);
    expect(esClaveDeContacto(undefined)).toBe(false);
    expect(claveReal('contact_attribute:distrito')).toBe('distrito');
  });

  it('los filtros llevan la clave prefijada, su grupo y el modelo intacto', () => {
    const [f] = comoFiltrosDeContacto([
      {
        attributeKey: 'distrito',
        value: 'distrito',
        label: 'Distrito',
        attributeModel: 'customAttributes',
      },
    ]);
    expect(f.attributeKey).toBe(`${PREFIJO_CONTACTO}distrito`);
    expect(f.value).toBe(`${PREFIJO_CONTACTO}distrito`);
    expect(f.grupoVisual).toBe(GRUPO_CONTACTO);
    expect(f.attributeModel).toBe('customAttributes');
    expect(f.label).toBe('Distrito');
    expect(comoFiltrosDeContacto(undefined)).toEqual([]);
  });

  it('las definiciones se prefijan sin tocar el resto', () => {
    expect(
      definicionesDeContacto([
        { attribute_key: 'distrito', attribute_display_type: 'list' },
      ])
    ).toEqual([
      {
        attribute_key: 'contact_attribute:distrito',
        attribute_display_type: 'list',
      },
    ]);
  });
});

describe('valorDeContacto', () => {
  it('lee del contacto, no del chat', () => {
    expect(
      valorDeContacto(chat({ distrito: 'Surco' }), 'contact_attribute:distrito')
    ).toBe('Surco');
  });

  it('sin valor devuelve null', () => {
    expect(valorDeContacto(chat({}), 'contact_attribute:distrito')).toBeNull();
    expect(
      valorDeContacto(chat({ distrito: '' }), 'contact_attribute:distrito')
    ).toBeNull();
    expect(valorDeContacto({}, 'contact_attribute:distrito')).toBeNull();
  });
});

describe('un chat que llega, contra un filtro por atributo de contacto', () => {
  const filtro = valor => [
    {
      attribute_key: 'contact_attribute:distrito',
      filter_operator: 'equal_to',
      values: [valor],
      query_operator: null,
    },
  ];

  it('encaja si el contacto tiene ese valor', () => {
    expect(matchesFilters(chat({ distrito: 'Surco' }), filtro('Surco'))).toBe(
      true
    );
  });

  it('no encaja con otro valor, aunque el chat tenga un atributo con ese nombre', () => {
    expect(
      matchesFilters(chat({ distrito: 'Surco' }), filtro('Del chat'))
    ).toBe(false);
  });
});

describe('el desplegable de atributos', () => {
  it('pinta los de contacto en su propio grupo, al final', () => {
    const t = clave => clave;
    const lista = groupFilterTypes(
      [
        { attributeKey: 'status', value: 'status', attributeModel: 'standard' },
        ...comoFiltrosDeContacto([
          {
            attributeKey: 'distrito',
            value: 'distrito',
            attributeModel: 'customAttributes',
          },
        ]),
      ],
      t
    );
    expect(lista.map(x => x.value)).toEqual([
      '__group_standard',
      'status',
      '__group_contactAttributes',
      'contact_attribute:distrito',
    ]);
    expect(lista[2].label).toBe('FILTER.GROUPS.TURUTA_CONTACT_ATTRIBUTES');
  });
});
