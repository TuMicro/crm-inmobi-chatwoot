import {
  MAX_INVITADOS,
  correosDe,
  errorDeInvitados,
  destinoDeLaVisita,
  textoDelDestino,
  textoCopia,
  textoCalendario,
  avisoDeVuelta,
} from './calendario';

describe('los correos invitados', () => {
  it('separados por comas, espacios o saltos; sin repetir y en minusculas', () => {
    expect(correosDe('Ana@x.com, luis@y.pe\nana@x.com;  eva@z.org')).toEqual({
      correos: ['ana@x.com', 'luis@y.pe', 'eva@z.org'],
      malos: [],
    });
    expect(correosDe(['A@x.com'])).toEqual({ correos: ['a@x.com'], malos: [] });
    expect(correosDe('')).toEqual({ correos: [], malos: [] });
    expect(correosDe(undefined)).toEqual({ correos: [], malos: [] });
  });

  it('lo que no es un correo se dice', () => {
    expect(correosDe('ana@x.com, pepe, z@z').malos).toEqual(['pepe', 'z@z']);
    expect(errorDeInvitados('ana@x.com, pepe')).toBe(
      'No parece un correo: pepe'
    );
    expect(errorDeInvitados('ana@x.com luis@y.pe')).toBe('');
    expect(errorDeInvitados('')).toBe('');
  });

  it('con tope', () => {
    const muchos = Array.from(
      { length: MAX_INVITADOS + 1 },
      (_, i) => `a${i}@x.com`
    ).join(', ');
    expect(errorDeInvitados(muchos)).toBe('Como mucho 10 correos.');
  });
});

describe('destinoDeLaVisita', () => {
  it('el del asesor asignado si lo tiene conectado', () => {
    const c = { conectados: [7, 9], asesorAgentId: 7 };
    expect(destinoDeLaVisita(c, 9)).toBe('asesor');
    expect(destinoDeLaVisita(c, 7)).toBe('mio');
  });

  it('si no, el de quien agenda; y si tampoco, ninguno', () => {
    expect(destinoDeLaVisita({ conectados: [9], asesorAgentId: 7 }, 9)).toBe(
      'mio'
    );
    expect(destinoDeLaVisita({ conectados: [9], asesorAgentId: null }, 9)).toBe(
      'mio'
    );
    expect(destinoDeLaVisita({ conectados: [], asesorAgentId: 7 }, 9)).toBe(
      null
    );
    expect(destinoDeLaVisita({ conectados: [3], asesorAgentId: 7 }, 9)).toBe(
      null
    );
  });

  it('si nadie de los dos, el de quien recibe copia de todas', () => {
    const c = { conectados: [1], asesorAgentId: 7, respaldo: 'Jefe' };
    expect(destinoDeLaVisita(c, 9)).toBe('respaldo');
    expect(destinoDeLaVisita({ ...c, conectados: [1, 9] }, 9)).toBe('mio');
    expect(destinoDeLaVisita({ ...c, respaldo: null }, 9)).toBe(null);
  });

  it('sin configurar en el servidor, ninguno', () => {
    expect(destinoDeLaVisita(null, 9)).toBe(null);
    expect(destinoDeLaVisita(undefined, 9)).toBe(null);
  });

  it('la frase del formulario', () => {
    const nombres = { asesor: 'Ana', respaldo: 'Jefe' };
    expect(textoDelDestino('mio', nombres)).toBe(
      'Se pone también en tu Google Calendar.'
    );
    expect(textoDelDestino('asesor', nombres)).toBe(
      'Se pone también en el Google Calendar de Ana.'
    );
    expect(textoDelDestino('respaldo', nombres)).toBe(
      'Se pone también en el Google Calendar de Jefe, que recibe copia de todas.'
    );
    expect(textoDelDestino(null, nombres)).toBe('');
  });

  it('la copia en una frase', () => {
    expect(textoCopia(['jefe@x.com', 'otra@y.pe'])).toBe(
      'Copia de todas las visitas: jefe@x.com, otra@y.pe.'
    );
    expect(textoCopia([])).toBe('');
    expect(textoCopia(undefined)).toBe('');
  });
});

describe('textoCalendario', () => {
  it('en el de quien esta, o por que no', () => {
    expect(textoCalendario({ estado: 'ok', de: 'Ana' })).toBe(
      'En el Google Calendar de Ana.'
    );
    expect(textoCalendario({ estado: 'pendiente', de: 'Ana' })).toBe(
      'Poniéndola en el Google Calendar de Ana…'
    );
    expect(
      textoCalendario({ estado: 'error', de: 'Ana', error: 'Google 503' })
    ).toBe('No se pudo poner en el Google Calendar de Ana: Google 503');
    expect(textoCalendario({ estado: 'sin_conectar', de: null })).toContain(
      'No está en Google Calendar'
    );
  });

  it('sin configurar, la ficha no dice nada', () => {
    expect(textoCalendario(null)).toBe('');
  });
});

describe('avisoDeVuelta', () => {
  it('conectado', () => {
    expect(avisoDeVuelta({ calendario: 'conectado' })).toEqual({
      ok: true,
      texto: 'Listo: tu Google Calendar quedó conectado.',
    });
  });

  it('el motivo, cuando se sabe', () => {
    expect(
      avisoDeVuelta({ calendario: 'error', detalle: 'cancelado' }).texto
    ).toContain('cancelaste');
    expect(
      avisoDeVuelta({ calendario: 'error', detalle: 'caducado' }).texto
    ).toContain('caducó');
    expect(avisoDeVuelta({ calendario: 'error', detalle: 'fallo' })).toEqual({
      ok: false,
      texto: 'Google no completó la conexión. Inténtalo otra vez.',
    });
  });

  it('una visita normal a la pagina: nada', () => {
    expect(avisoDeVuelta({})).toBe(null);
    expect(avisoDeVuelta(undefined)).toBe(null);
  });
});
