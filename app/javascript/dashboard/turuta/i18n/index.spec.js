import { describe, it, expect } from 'vitest';
import { mezclar } from './index';
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
