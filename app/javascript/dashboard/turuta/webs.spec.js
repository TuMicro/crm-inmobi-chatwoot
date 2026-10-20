import { describe, it, expect, afterEach } from 'vitest';
import { ocultarWebs, rotulosDeWebs } from './webs';

describe('ocultarWebs', () => {
  afterEach(() => {
    delete window.globalConfig;
  });

  it('lo decide la marca del dominio', () => {
    window.globalConfig = { TURUTA_OCULTAR_WEBS: true };
    expect(ocultarWebs()).toBe(true);
    window.globalConfig = {};
    expect(ocultarWebs()).toBe(false);
    delete window.globalConfig;
    expect(ocultarWebs()).toBe(false);
  });
});

describe('rotulosDeWebs', () => {
  it('con la marca de siempre, el nombre real', () => {
    const rotulo = rotulosDeWebs(['madhouse'], [], false);
    expect(rotulo('madhouse')).toBe('madhouse');
    expect(rotulo('joserojas', 'José Rojas Bienes Raíces')).toBe(
      'José Rojas Bienes Raíces'
    );
  });

  it('con una marca generica, un numero: primero las conectadas', () => {
    const rotulo = rotulosDeWebs(
      ['madhouse', 'joserojas'],
      ['otra', 'madhouse'],
      true
    );
    expect(rotulo('joserojas', 'José Rojas Bienes Raíces')).toBe('Web 1');
    expect(rotulo('madhouse')).toBe('Web 2');
    expect(rotulo('otra')).toBe('Web 3');
    expect(rotulo('desconocida')).toBe('Web');
  });

  it('la misma web, el mismo numero, aunque una pagina no sepa de las demas', () => {
    const propiedades = rotulosDeWebs(['madhouse', 'joserojas'], ['aaa'], true);
    const ia = rotulosDeWebs(['joserojas', 'madhouse'], [], true);
    expect(propiedades('madhouse')).toBe(ia('madhouse'));
    expect(propiedades('joserojas')).toBe(ia('joserojas'));
  });
});
