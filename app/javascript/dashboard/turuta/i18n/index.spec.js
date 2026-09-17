import { describe, it, expect } from 'vitest';
import { conMarca, mezclar } from './index';
import es from 'dashboard/i18n/locale/es';

describe('mezclar', () => {
  it('lo nuestro gana y lo demas se conserva', () => {
    const base = { A: { X: 'uno', Y: 'dos' }, B: 'tres' };
    const r = mezclar(base, { A: { X: 'UNO' } });
    expect(r).toEqual({ A: { X: 'UNO', Y: 'dos' }, B: 'tres' });
    expect(base.A.X).toBe('uno');
  });

  it('crea las ramas que Chatwoot no tiene en espanol', () => {
    expect(mezclar({}, { A: { B: 'x' } })).toEqual({ A: { B: 'x' } });
  });
});

describe('textos en espanol con nuestra capa', () => {
  it('dice chats, no conversaciones', () => {
    expect(es.SIDEBAR.CONVERSATIONS).toBe('Chats');
    expect(es.SIDEBAR.ALL_CONVERSATIONS).toBe('Todos los chats');
  });

  it('conserva los textos de Chatwoot que no tocamos', () => {
    expect(es.SIDEBAR.CONTACTS).toBeTruthy();
    expect(es.CONTACT_FORM.FORM.SUBMIT).toBe('Guardar');
  });

  it('no queda ninguna "conversacion" en los textos', () => {
    const restos = [];
    const mirar = (o, ruta) =>
      Object.keys(o).forEach(k => {
        const p = ruta ? ruta + '.' + k : k;
        if (o[k] && typeof o[k] === 'object') mirar(o[k], p);
        else if (/conversaci/i.test(String(o[k]))) restos.push(p);
      });
    mirar(es, '');
    expect(restos).toEqual([]);
  });
});

describe('conMarca', () => {
  it('cambia Chatwoot y Woot sueltos por la marca, a cualquier profundidad', () => {
    const r = conMarca(
      { A: 'Bienvenido a Chatwoot', B: { C: 'servidor Woot caido' } },
      'MadHouse CRM'
    );
    expect(r).toEqual({
      A: 'Bienvenido a MadHouse CRM',
      B: { C: 'servidor MadHouse CRM caido' },
    });
  });

  it('no toca las URL ni otras palabras', () => {
    const textos = { A: 'https://www.chatwoot.com/docs', B: 'Wootric', C: 7 };
    expect(conMarca(textos, 'MadHouse')).toEqual(textos);
  });

  it('sin marca, o con la de fabrica, devuelve lo mismo', () => {
    const textos = { A: 'Chatwoot' };
    expect(conMarca(textos, '')).toBe(textos);
    expect(conMarca(textos, 'Chatwoot')).toBe(textos);
  });

  it('quita de la marca lo que rompe a vue-i18n', () => {
    expect(conMarca({ A: 'Chatwoot' }, 'Mad{House} | CRM @').A).toBe(
      'MadHouse  CRM'
    );
  });
});
