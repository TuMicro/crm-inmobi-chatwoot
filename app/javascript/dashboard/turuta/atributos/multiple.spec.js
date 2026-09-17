import { describe, it, expect } from 'vitest';
import {
  aLista,
  alternar,
  contieneAlguna,
  esIdDeFiltro,
  idDeFiltro,
  opcionesDeFiltro,
  textoParaContiene,
} from './multiple';

const OPCIONES = ['Miraflores', 'Surco', 'Sur', 'La Molina'];

describe('aLista', () => {
  it('devuelve el array tal cual, sin huecos', () => {
    expect(aLista(['Surco', '', null, 'Sur'])).toEqual(['Surco', 'Sur']);
  });

  it('un texto suelto cuenta como una opcion', () => {
    expect(aLista('Surco')).toEqual(['Surco']);
  });

  it('lo demas es una lista vacia', () => {
    expect(aLista(undefined)).toEqual([]);
    expect(aLista(null)).toEqual([]);
    expect(aLista('   ')).toEqual([]);
    expect(aLista(7)).toEqual([]);
  });
});

describe('alternar', () => {
  it('marca una opcion nueva', () => {
    expect(alternar(['Surco'], 'Miraflores', OPCIONES)).toEqual([
      'Miraflores',
      'Surco',
    ]);
  });

  it('desmarca la que ya estaba', () => {
    expect(alternar(['Miraflores', 'Surco'], 'Surco', OPCIONES)).toEqual([
      'Miraflores',
    ]);
  });

  it('el orden es el de las opciones, no el de los clics', () => {
    const uno = alternar(
      alternar([], 'La Molina', OPCIONES),
      'Surco',
      OPCIONES
    );
    const dos = alternar(
      alternar([], 'Surco', OPCIONES),
      'La Molina',
      OPCIONES
    );
    expect(uno).toEqual(dos);
    expect(uno).toEqual(['Surco', 'La Molina']);
  });

  it('una opcion que ya no existe se conserva, al final', () => {
    expect(alternar(['Barranco'], 'Surco', OPCIONES)).toEqual([
      'Surco',
      'Barranco',
    ]);
  });

  it('no toca la lista que recibe', () => {
    const original = ['Surco'];
    alternar(original, 'Sur', OPCIONES);
    expect(original).toEqual(['Surco']);
  });
});

describe('filtro', () => {
  it('la opcion viaja con sus comillas', () => {
    expect(idDeFiltro('Sur')).toBe('"Sur"');
  });

  it('con comillas, «Sur» no encaja dentro de «Surco»', () => {
    const guardado = textoParaContiene(['Miraflores', 'Surco']);
    expect(guardado.includes(idDeFiltro('Sur'))).toBe(false);
    expect(guardado.includes(idDeFiltro('Surco'))).toBe(true);
  });

  it('solo da opciones para atributos de seleccion multiple', () => {
    expect(
      opcionesDeFiltro({
        attributeDisplayType: 'multi_list',
        attributeValues: ['Sur'],
      })
    ).toEqual([{ id: '"Sur"', name: 'Sur' }]);
    expect(
      opcionesDeFiltro({
        attributeDisplayType: 'list',
        attributeValues: ['Sur'],
      })
    ).toEqual([]);
    expect(opcionesDeFiltro(undefined)).toEqual([]);
  });

  it('lo que no es un array pasa tal cual', () => {
    expect(textoParaContiene('hola')).toBe('hola');
    expect(textoParaContiene(undefined)).toBe(undefined);
  });
});

describe('contiene, en el filtro en vivo', () => {
  it('reconoce un valor de filtro nuestro por sus comillas', () => {
    expect(esIdDeFiltro('"Sur"')).toBe(true);
    expect(esIdDeFiltro('Sur')).toBe(false);
    expect(esIdDeFiltro('""')).toBe(false);
    expect(esIdDeFiltro(3)).toBe(false);
  });

  it('basta con que encaje una de las opciones', () => {
    const guardado = ['Miraflores', 'Surco'];
    expect(contieneAlguna(['"Sur"', '"Surco"'], guardado)).toBe(true);
    expect(contieneAlguna(['"Sur"', '"La Molina"'], guardado)).toBe(false);
  });

  it('no distingue mayusculas, como el servidor', () => {
    expect(contieneAlguna(['"surco"'], ['Surco'])).toBe(true);
  });

  it('sin valor guardado no encaja nada', () => {
    expect(contieneAlguna(['"Sur"'], undefined)).toBe(false);
  });
});
