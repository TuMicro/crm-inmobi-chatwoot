import { describe, it, expect } from 'vitest';
import {
  esPmPorDefecto,
  horaDesdePartes,
  minutoValido,
  partesDeHora,
  textoHora,
} from './hora';

describe('hora: el campo de hora por partes', () => {
  it('parte la hora en hora de reloj, minuto y a. m. o p. m.', () => {
    expect(partesDeHora('13:05')).toEqual({ hora: 1, minuto: 5, pm: true });
    expect(partesDeHora('00:00')).toEqual({ hora: 12, minuto: 0, pm: false });
    expect(partesDeHora('12:30')).toEqual({ hora: 12, minuto: 30, pm: true });
    expect(partesDeHora('09:00')).toEqual({ hora: 9, minuto: 0, pm: false });
  });

  it('sin hora, o con algo que no lo es, no hay partes', () => {
    expect(partesDeHora('')).toBeNull();
    expect(partesDeHora(null)).toBeNull();
    expect(partesDeHora('25:00')).toBeNull();
    expect(partesDeHora('10:75')).toBeNull();
  });

  it('las partes vuelven a ser la misma hora', () => {
    ['00:00', '00:35', '09:00', '11:55', '12:00', '13:05', '23:59'].forEach(h =>
      expect(horaDesdePartes(partesDeHora(h))).toBe(h)
    );
  });

  it('la escribe como el resto de la ficha', () => {
    expect(textoHora('13:00')).toBe('1:00 p. m.');
    expect(textoHora('09:05')).toBe('9:05 a. m.');
    expect(textoHora('')).toBe('');
  });

  it('sin decir a. m. o p. m., de 8 a 11 es la manana y el resto la tarde', () => {
    expect([8, 9, 10, 11].map(esPmPorDefecto)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect([12, 1, 4, 7].map(esPmPorDefecto)).toEqual([true, true, true, true]);
  });

  it('el minuto escrito a mano vale de 0 a 59, y nada mas', () => {
    expect(minutoValido('0')).toBe(0);
    expect(minutoValido('07')).toBe(7);
    expect(minutoValido(' 59 ')).toBe(59);
    expect(minutoValido('60')).toBeNull();
    expect(minutoValido('')).toBeNull();
    expect(minutoValido('1a')).toBeNull();
    expect(minutoValido('-5')).toBeNull();
    expect(minutoValido('3.5')).toBeNull();
  });
});
