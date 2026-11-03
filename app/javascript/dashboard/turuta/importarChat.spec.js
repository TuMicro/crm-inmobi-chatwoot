import { describe, it, expect } from 'vitest';
import {
  analizarChat,
  contactoDelArchivo,
  mensajesParaImportar,
  negocioProbable,
  ordenDeFecha,
  SOLO_CLIENTE,
  telefonoE164,
  textoDelZip,
} from './importarChat';

// Los espacios raros son los de verdad: Android pone U+202F antes de "p. m." y
// el iPhone empieza las lineas de sistema y de adjuntos con U+200E.
const ANDROID_24H = [
  '3/11/26, 16:58 - Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.',
  '3/11/26, 17:00 - Juan Pérez: Hola, busco un departamento en Surco',
  '3/11/26, 17:01 - MadHouse Inmobiliaria: Hola Juan, te paso opciones',
  'Primera: Chacarilla',
  'Segunda: Monterrico',
  '3/11/26, 17:02 - Juan Pérez: <Multimedia omitido>',
  '3/11/26, 17:03 - Juan Pérez: Se eliminó este mensaje.',
  '4/11/26, 9:15 - MadHouse Inmobiliaria: ¿Te queda bien el sábado? <Se editó este mensaje.>',
].join('\n');

const ANDROID_12H = [
  '13/11/26, 5:00 p. m. - Juan: Hola',
  '13/11/26, 12:30 a. m. - MadHouse: Buenas noches',
].join('\n');

const IPHONE = [
  '[3/11/26, 17:00:12] MadHouse: ‎Los mensajes y las llamadas están cifrados de extremo a extremo.',
  '[3/11/26, 17:00:15] Juan: Hola',
  '‎[3/11/26, 17:01:02] Juan: ‎<adjunto: 00000012-PHOTO-2026-11-03.jpg>',
  '[3/11/26, 5:02:00 p. m.] MadHouse: Recibido',
].join('\r\n');

describe('analizarChat', () => {
  it('lee Android de 24 h: varias lineas, archivos, editados y avisos', () => {
    const r = analizarChat(ANDROID_24H);
    expect(r.mensajes).toEqual([
      {
        fecha: '2026-11-03 17:00:00',
        remitente: 'Juan Pérez',
        texto: 'Hola, busco un departamento en Surco',
      },
      {
        fecha: '2026-11-03 17:01:00',
        remitente: 'MadHouse Inmobiliaria',
        texto:
          'Hola Juan, te paso opciones\nPrimera: Chacarilla\nSegunda: Monterrico',
      },
      {
        fecha: '2026-11-03 17:02:00',
        remitente: 'Juan Pérez',
        texto: '📎 (archivo no incluido en la exportación)',
      },
      {
        fecha: '2026-11-04 09:15:00',
        remitente: 'MadHouse Inmobiliaria',
        texto: '¿Te queda bien el sábado?',
      },
    ]);
    expect(r.remitentes).toEqual([
      { nombre: 'Juan Pérez', cuantos: 2 },
      { nombre: 'MadHouse Inmobiliaria', cuantos: 2 },
    ]);
    expect(r.desde).toBe('2026-11-03 17:00:00');
    expect(r.hasta).toBe('2026-11-04 09:15:00');
    expect(r.sinEntender).toBe(0);
  });

  it('lee la hora de 12 h con "p. m." y espacios raros', () => {
    const r = analizarChat(ANDROID_12H);
    expect(r.mensajes.map(m => m.fecha)).toEqual([
      '2026-11-13 17:00:00',
      '2026-11-13 00:30:00',
    ]);
  });

  it('lee el iPhone: corchetes, segundos, \\r\\n y adjuntos', () => {
    const r = analizarChat(IPHONE);
    expect(r.mensajes).toEqual([
      { fecha: '2026-11-03 17:00:15', remitente: 'Juan', texto: 'Hola' },
      {
        fecha: '2026-11-03 17:01:02',
        remitente: 'Juan',
        texto: '📎 00000012-PHOTO-2026-11-03.jpg',
      },
      {
        fecha: '2026-11-03 17:02:00',
        remitente: 'MadHouse',
        texto: 'Recibido',
      },
    ]);
  });

  it('pone el mes primero si el fichero es de un celular en ingles', () => {
    const r = analizarChat(
      ['11/3/26, 5:00 PM - Juan: Hi', '11/23/26, 9:00 AM - Juan: Again'].join(
        '\n'
      )
    );
    expect(r.orden).toBe('MDY');
    expect(r.mensajes[0].fecha).toBe('2026-11-03 17:00:00');
  });

  it('lee el iPhone en ingles de MadHouse: mes primero aunque ningun dia pase de 12', () => {
    // El formato de los chats que exporto MadHouse (docs/chats, 03/11/2026).
    const r = analizarChat(
      [
        'Los mensajes y las llamadas están cifrados de extremo a extremo.',
        '[9/10/26, 11:03:48 PM] +1 (508) 372-0652: Hola, ¿sigue disponible?',
        '[9/10/26, 11:03:49 PM] - Los mensajes y las llamadas están cifrados de extremo a extremo. Toca para obtener más información.',
        '[9/11/26, 9:15:02 AM] José Rojas: Sí, ¿lo quieres visitar?',
      ].join('\n')
    );
    expect(r.orden).toBe('MDY');
    expect(r.mensajes.map(m => m.fecha)).toEqual([
      '2026-09-10 23:03:48',
      '2026-09-11 09:15:02',
    ]);
  });

  it('con fechas ambiguas, gana la lectura en la que no retroceden', () => {
    // 9/12 -> 10/1: en dia primero seria del 9 de diciembre al 10 de enero.
    const r = analizarChat(
      ['[9/12/26, 10:00:00] Juan: Hola', '[10/1/26, 10:00:00] Juan: Sigo'].join(
        '\n'
      )
    );
    expect(r.orden).toBe('MDY');
  });

  it('"p. m." con fechas ambiguas es dia primero, y se puede forzar', () => {
    const texto = '3/11/26, 5:00 p. m. - Juan: Hola';
    expect(analizarChat(texto).mensajes[0].fecha).toBe('2026-11-03 17:00:00');
    expect(analizarChat(texto, { orden: 'MDY' }).mensajes[0].fecha).toBe(
      '2026-03-11 17:00:00'
    );
  });

  it('no inventa mensajes con un fichero que no es un chat', () => {
    const r = analizarChat('hola\nesto no es un chat');
    expect(r.mensajes).toEqual([]);
    expect(r.remitentes).toEqual([]);
  });
});

describe('ordenDeFecha', () => {
  it('sin pistas, el dia primero', () => {
    expect(ordenDeFecha([[3, 11]])).toBe('DMY');
    expect(ordenDeFecha([[13, 11]])).toBe('DMY');
    expect(ordenDeFecha([[11, 13]])).toBe('MDY');
  });
});

describe('contactoDelArchivo y negocioProbable', () => {
  it('saca el contacto del nombre del fichero', () => {
    expect(contactoDelArchivo('Chat de WhatsApp con Juan Pérez.txt')).toBe(
      'Juan Pérez'
    );
    expect(contactoDelArchivo('WhatsApp Chat with Juan.zip')).toBe('Juan');
    expect(contactoDelArchivo('_chat.txt')).toBeNull();
  });

  it('la inmobiliaria es el otro remitente', () => {
    const remitentes = [
      { nombre: 'Juan Pérez', cuantos: 3 },
      { nombre: 'MadHouse', cuantos: 2 },
    ];
    expect(negocioProbable(remitentes, 'Juan Pérez')).toBe('MadHouse');
    expect(negocioProbable(remitentes, 'Otro')).toBeNull();
    expect(negocioProbable(remitentes, null)).toBeNull();
  });

  it('sin nombre de fichero, el cliente es el que sale con su numero', () => {
    const remitentes = [
      { nombre: '+1 (508) 372-0652', cuantos: 5 },
      { nombre: 'José Rojas', cuantos: 4 },
    ];
    expect(negocioProbable(remitentes, null)).toBe('José Rojas');
    expect(negocioProbable([remitentes[0]], null)).toBeNull();
  });
});

describe('telefonoE164', () => {
  it('normaliza los formatos de siempre', () => {
    expect(telefonoE164('+51 966 723 347')).toBe('+51966723347');
    expect(telefonoE164('966-723-347')).toBe('+51966723347');
    expect(telefonoE164('+1 (555) 132-5825')).toBe('+15551325825');
    expect(telefonoE164('Juan Pérez')).toBeNull();
    expect(telefonoE164('123')).toBeNull();
  });
});

describe('mensajesParaImportar', () => {
  it('entrante es lo que escribio el cliente', () => {
    const r = analizarChat(ANDROID_24H);
    const m = mensajesParaImportar(r.mensajes, 'MadHouse Inmobiliaria');
    expect(m.map(x => x.entrante)).toEqual([true, false, true, false]);
    expect(Object.keys(m[0])).toEqual(['fecha', 'entrante', 'texto']);
  });

  it('si solo escribio el cliente, todo es entrante', () => {
    const r = analizarChat(ANDROID_24H);
    const m = mensajesParaImportar(r.mensajes, SOLO_CLIENTE);
    expect(m.every(x => x.entrante)).toBe(true);
  });
});

// Un .zip de una sola entrada, como el del iPhone, escrito a mano: con el
// texto tal cual (metodo 0) o comprimido (metodo 8).
async function zipCon(nombre, texto, comprimir) {
  const nombreBytes = new TextEncoder().encode(nombre);
  let datos = new TextEncoder().encode(texto);
  const tamano = datos.length;
  if (comprimir) {
    const flujo = new Response(datos).body.pipeThrough(
      new CompressionStream('deflate-raw')
    );
    datos = new Uint8Array(await new Response(flujo).arrayBuffer());
  }
  const metodo = comprimir ? 8 : 0;
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true);
  local.setUint16(8, metodo, true);
  local.setUint32(18, datos.length, true);
  local.setUint32(22, tamano, true);
  local.setUint16(26, nombreBytes.length, true);
  const central = new DataView(new ArrayBuffer(46));
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(10, metodo, true);
  central.setUint32(20, datos.length, true);
  central.setUint32(24, tamano, true);
  central.setUint16(28, nombreBytes.length, true);
  central.setUint32(42, 0, true);
  const inicioCentral = 30 + nombreBytes.length + datos.length;
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(10, 1, true);
  fin.setUint32(12, 46 + nombreBytes.length, true);
  fin.setUint32(16, inicioCentral, true);
  const partes = [
    new Uint8Array(local.buffer),
    nombreBytes,
    datos,
    new Uint8Array(central.buffer),
    nombreBytes,
    new Uint8Array(fin.buffer),
  ];
  const zip = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  partes.reduce((o, p) => {
    zip.set(p, o);
    return o + p.length;
  }, 0);
  return zip.buffer;
}

describe('textoDelZip', () => {
  it('saca el _chat.txt guardado tal cual', async () => {
    const zip = await zipCon('_chat.txt', IPHONE, false);
    expect(await textoDelZip(zip)).toBe(IPHONE);
  });

  it('y comprimido', async () => {
    const zip = await zipCon('_chat.txt', IPHONE, true);
    expect(await textoDelZip(zip)).toBe(IPHONE);
  });

  it('avisa si no es un .zip', async () => {
    await expect(textoDelZip(new ArrayBuffer(40))).rejects.toThrow(
      'no es un .zip'
    );
  });
});
