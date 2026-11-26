import { describe, it, expect } from 'vitest';

// El `message` de Input.vue de Chatwoot se pinta en UNA linea (`truncate`).
// Con un texto de ayuda largo, el campo se ensancha hasta salirse de su
// tarjeta, o el texto se corta con puntos suspensivos. Paso en "Reiniciar un
// lead" (del 05/10 al 25/11): la caja del numero asomaba por la derecha.
// Los textos largos van en un parrafo nuestro, debajo del campo.
const paginas = import.meta.glob('./*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const LARGO = 70;
const TEXTO_FIJO = /\smessage="([^"]*)"/g;
// Tambien los que van dentro de una expresion: :message="a ? 'uno' : 'otro'".
const EXPRESION = /\s:message="([^"]*)"/g;
const ENTRE_COMILLAS = /'([^']*)'/g;

describe('los textos de ayuda de los campos', () => {
  it('hay paginas que mirar', () => {
    expect(Object.keys(paginas).length).toBeGreaterThan(5);
  });

  it.each(Object.keys(paginas))('%s: ninguno es largo', archivo => {
    const fuente = paginas[archivo];
    const textos = [
      ...[...fuente.matchAll(TEXTO_FIJO)].map(m => m[1]),
      ...[...fuente.matchAll(EXPRESION)].flatMap(m =>
        [...m[1].matchAll(ENTRE_COMILLAS)].map(t => t[1])
      ),
    ];
    expect(textos.filter(t => t.length > LARGO)).toEqual([]);
  });
});
