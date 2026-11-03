// [turuta] Leer un chat exportado de WhatsApp ("Exportar chat" en el celular)
// para importarlo (ImportarChatPage.vue). Funciones puras, sin Vue: se prueban
// en importarChat.spec.js con los formatos reales de Android y de iPhone.
//
// Lo que sale del celular es un .txt (Android) o un .zip con _chat.txt dentro
// (iPhone), con una linea por mensaje:
//
//   Android: 3/11/26, 17:00 - Kefrin: Hola
//            3/11/26, 5:00 p. m. - Kefrin: Hola
//   iPhone:  [3/11/26, 17:00:12] Kefrin: Hola
//            [11/3/26, 5:00:12 PM] Kefrin: Hola   (en ingles: mes primero)
//
// Un mensaje de varias lineas sigue en las lineas siguientes, sin fecha. Las
// lineas del sistema ("Los mensajes ... estan cifrados") no tienen remitente.

const CABECERA =
  /^\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]\.?\s*m\.?))?\]?\s*(?:-\s+)?(.*)$/i;

/** Valor de "¿Quien es la inmobiliaria?" cuando solo escribio el cliente. */
export const SOLO_CLIENTE = '__solo_cliente__';

// Avisos que WhatsApp pone a nombre del chat y que no son mensajes de nadie.
const AVISOS_DEL_SISTEMA = [
  /cifrados de extremo a extremo/i,
  /end-to-end encrypted/i,
  /^(se eliminó|eliminaste|este mensaje fue eliminado)/i,
  /^(this message was deleted|you deleted this message)/i,
];

const SIN_ARCHIVO = '📎 (archivo no incluido en la exportación)';
const ARCHIVO_OMITIDO =
  /^<?\s*(multimedia|media|imagen|image|video|vídeo|audio|sticker|documento|document|gif|archivo)\b[^>]*\b(omitid[oa]s?|omitted)\s*>?$/i;
const ADJUNTO = /^<(?:adjunto|attached):\s*([^>]+)>$/i;
const EDITADO = /\s*<(?:se editó este mensaje|this message was edited)\.?>$/i;

// Las marcas de direccion (U+200E, U+200F) y el BOM, que el iPhone pone al
// principio de las lineas de sistema; y los espacios raros (U+202F, U+00A0,
// U+2009) que Android pone en "5:00 p. m.". Con fromCharCode y no a la vista:
// invisibles en el codigo, nadie sabria que estan.
const INVISIBLES = new RegExp(
  `[${String.fromCharCode(0x200e, 0x200f, 0xfeff)}]`,
  'g'
);
const ESPACIOS_RAROS = new RegExp(
  `[${String.fromCharCode(0x202f, 0x00a0, 0x2009)}]`,
  'g'
);

/** Quita los caracteres invisibles que meten las exportaciones. */
export function limpiarLinea(linea) {
  return String(linea)
    .replace(INVISIBLES, '')
    .replace(ESPACIOS_RAROS, ' ')
    .replace(/\r$/, '');
}

/**
 * DMY o MDY. Un celular en español escribe 3/11/26 (dia primero) y un iPhone
 * en ingles de EE. UU. 11/3/26 (mes primero): asi venian los chats que
 * exporto MadHouse (03/11/2026). Se decide con el fichero entero:
 *   1. si algun primer numero pasa de 12 es el dia; si algun segundo, el mes;
 *   2. si no, la lectura en la que las fechas retroceden menos veces (un chat
 *      exportado va en orden);
 *   3. si empatan, "AM"/"PM" a la inglesa (sin puntos) es EE. UU.; "p. m." o
 *      las 24 h, dia primero.
 * Si aun asi sale mal, la pagina deja elegirlo a mano.
 */
export function ordenDeFecha(pares, pistas = {}) {
  if (pares.some(([a]) => a > 12)) return 'DMY';
  if (pares.some(([, b]) => b > 12)) return 'MDY';
  const { retrocesosDMY = 0, retrocesosMDY = 0, ingles = false } = pistas;
  if (retrocesosDMY !== retrocesosMDY) {
    return retrocesosDMY < retrocesosMDY ? 'DMY' : 'MDY';
  }
  return ingles ? 'MDY' : 'DMY';
}

const dos = n => String(n).padStart(2, '0');

function fechaDe(m, orden) {
  const a = Number(m[1]);
  const b = Number(m[2]);
  const dia = orden === 'DMY' ? a : b;
  const mes = orden === 'DMY' ? b : a;
  let anio = Number(m[3]);
  if (anio < 100) anio += 2000;
  let hora = Number(m[4]);
  const ampm = (m[7] || '').charAt(0).toLowerCase();
  if (ampm === 'p' && hora < 12) hora += 12;
  if (ampm === 'a' && hora === 12) hora = 0;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23) return null;
  return `${anio}-${dos(mes)}-${dos(dia)} ${dos(hora)}:${m[5]}:${dos(m[6] || 0)}`;
}

function textoDelMensaje(texto) {
  const t = texto.replace(EDITADO, '').trim();
  if (ARCHIVO_OMITIDO.test(t)) return SIN_ARCHIVO;
  const adjunto = ADJUNTO.exec(t);
  if (adjunto) return `📎 ${adjunto[1].trim()}`;
  return t;
}

function retrocesos(cabeceras, orden) {
  let n = 0;
  let anterior = '';
  cabeceras.forEach(m => {
    const f = m && fechaDe(m, orden);
    if (!f) return;
    if (anterior && f < anterior) n += 1;
    anterior = f;
  });
  return n;
}

/**
 * Lee el texto de una exportacion. Devuelve los mensajes en orden, con
 * fecha local "AAAA-MM-DD HH:MM:SS" (la del celular: la API la pasa a la zona
 * del cliente), quien lo mando y el texto; los remitentes con cuantos
 * mensajes mando cada uno; y cuantas lineas con fecha no se entendieron.
 * Con { orden: 'DMY' | 'MDY' } se fuerza el orden de las fechas.
 */
export function analizarChat(texto, { orden: forzado } = {}) {
  const lineas = String(texto ?? '')
    .split('\n')
    .map(limpiarLinea);
  const cabeceras = lineas.map(l => CABECERA.exec(l));
  const conFecha = cabeceras.filter(Boolean);
  const orden =
    forzado ||
    ordenDeFecha(
      conFecha.map(m => [Number(m[1]), Number(m[2])]),
      {
        retrocesosDMY: retrocesos(cabeceras, 'DMY'),
        retrocesosMDY: retrocesos(cabeceras, 'MDY'),
        ingles: conFecha.some(m => /^[ap]m$/i.test(m[7] || '')),
      }
    );

  const mensajes = [];
  let actual = null;
  let sinEntender = 0;

  lineas.forEach((linea, i) => {
    const m = cabeceras[i];
    if (!m) {
      // Continuacion del mensaje anterior. Antes del primero (la cabecera de
      // algunas exportaciones), no hay a quien pegarla.
      if (actual && linea) actual.texto += `\n${linea}`;
      return;
    }
    actual = null;
    const fecha = fechaDe(m, orden);
    if (!fecha) {
      sinEntender += 1;
      return;
    }
    const resto = m[8];
    const corte = resto.indexOf(': ');
    if (corte <= 0) return; // aviso del sistema, sin remitente
    const contenido = resto.slice(corte + 2);
    if (AVISOS_DEL_SISTEMA.some(r => r.test(contenido))) return;
    actual = {
      fecha,
      remitente: resto.slice(0, corte).trim(),
      texto: contenido,
    };
    mensajes.push(actual);
  });

  mensajes.forEach(msg => {
    msg.texto = textoDelMensaje(msg.texto);
  });
  const conTexto = mensajes.filter(msg => msg.texto);

  const cuenta = new Map();
  conTexto.forEach(msg =>
    cuenta.set(msg.remitente, (cuenta.get(msg.remitente) || 0) + 1)
  );
  const remitentes = [...cuenta.entries()]
    .map(([nombre, cuantos]) => ({ nombre, cuantos }))
    .sort((a, b) => b.cuantos - a.cuantos);

  return {
    mensajes: conTexto,
    remitentes,
    desde: conTexto[0]?.fecha ?? null,
    hasta: conTexto[conTexto.length - 1]?.fecha ?? null,
    orden,
    sinEntender,
  };
}

/**
 * El contacto del nombre del fichero: "Chat de WhatsApp con Juan Pérez.txt"
 * o "WhatsApp Chat with Juan Pérez.zip" -> "Juan Pérez". Null si no sigue
 * ese patron (el _chat.txt del iPhone, o un fichero renombrado).
 */
export function contactoDelArchivo(nombreArchivo) {
  const base = String(nombreArchivo ?? '').replace(/\.(txt|zip)$/i, '');
  const m =
    /(?:chat de whatsapp con|whatsapp chat with|whatsapp chat -)\s+(.+)$/i.exec(
      base
    );
  return m ? m[1].trim() : null;
}

/**
 * El numero en formato E.164. Acepta espacios y guiones; un celular de Peru de
 * 9 digitos sin prefijo tambien vale ("966 723 347" -> "+51966723347"). Null
 * si no parece un telefono. Lo mismo que telefonoE164 de la API
 * (dashboard-app/reinicio.logic.ts).
 */
export function telefonoE164(entrada) {
  const texto = String(entrada ?? '').trim();
  if (/[a-z]/i.test(texto)) return null;
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return null;
  let e164 = `+${digitos}`;
  if (!texto.startsWith('+')) {
    if (digitos.length === 9 && digitos.startsWith('9')) e164 = `+51${digitos}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/**
 * Quien es la inmobiliaria, en un chat de dos: el remitente que NO es el
 * contacto del nombre del fichero; o, si el fichero no lo dice, el que no es
 * un numero de telefono (un contacto sin guardar sale con su numero, y ese es
 * el cliente). Null si no se puede saber; entonces lo elige quien importa.
 */
export function negocioProbable(remitentes, contacto) {
  if (remitentes.length !== 2) return null;
  const [x, y] = remitentes;
  if (contacto && x.nombre === contacto) return y.nombre;
  if (contacto && y.nombre === contacto) return x.nombre;
  const xEsTelefono = !!telefonoE164(x.nombre);
  const yEsTelefono = !!telefonoE164(y.nombre);
  if (xEsTelefono === yEsTelefono) return null;
  return xEsTelefono ? y.nombre : x.nombre;
}

/** Los mensajes como los pide la importacion: entrante = lo escribio el cliente. */
export function mensajesParaImportar(mensajes, negocio) {
  return mensajes.map(m => ({
    fecha: m.fecha,
    entrante: m.remitente !== negocio,
    texto: m.texto,
  }));
}

// ------------------------------------------------------------------ el .zip
//
// El iPhone exporta un .zip con _chat.txt dentro (y las fotos, si se eligio
// "adjuntar archivos"). Se lee con lo que trae el navegador
// (DecompressionStream), sin libreria: solo hace falta sacar un fichero.

const firma = (v, o) => v.getUint32(o, true);

async function descomprimir(bytes, metodo) {
  if (metodo === 0) return bytes;
  if (metodo !== 8)
    throw new Error('El .zip usa una compresión que no se puede leer');
  const flujo = new Response(bytes).body.pipeThrough(
    new DecompressionStream('deflate-raw')
  );
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/** El texto del primer .txt de un .zip. */
export async function textoDelZip(buffer) {
  const v = new DataView(buffer);
  let fin = -1;
  for (let o = buffer.byteLength - 22; o >= 0; o -= 1) {
    if (firma(v, o) === 0x06054b50) {
      fin = o;
      break;
    }
  }
  if (fin < 0) throw new Error('El fichero no es un .zip válido');
  const entradas = v.getUint16(fin + 10, true);
  let o = v.getUint32(fin + 16, true);
  const decodificador = new TextDecoder('utf-8');
  for (let i = 0; i < entradas; i += 1) {
    if (firma(v, o) !== 0x02014b50) break;
    const metodo = v.getUint16(o + 10, true);
    const comprimido = v.getUint32(o + 20, true);
    const largoNombre = v.getUint16(o + 28, true);
    const largoExtra = v.getUint16(o + 30, true);
    const largoComentario = v.getUint16(o + 32, true);
    const local = v.getUint32(o + 42, true);
    const nombre = decodificador.decode(
      new Uint8Array(buffer, o + 46, largoNombre)
    );
    if (/\.txt$/i.test(nombre) && !nombre.startsWith('__MACOSX')) {
      const inicio =
        local +
        30 +
        v.getUint16(local + 26, true) +
        v.getUint16(local + 28, true);
      // Dentro del bucle a proposito: se sale con el primer .txt.
      // eslint-disable-next-line no-await-in-loop
      const datos = await descomprimir(
        new Uint8Array(buffer, inicio, comprimido),
        metodo
      );
      return decodificador.decode(datos);
    }
    o += 46 + largoNombre + largoExtra + largoComentario;
  }
  throw new Error('El .zip no tiene ningún chat (.txt) dentro');
}
