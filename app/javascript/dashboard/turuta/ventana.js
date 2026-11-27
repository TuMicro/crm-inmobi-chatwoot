// [turuta] La ventana de cada canal en la ficha del lead (docs/21 § 4.2 y D3
// del repo crm-inmobi). La regla de verdad esta en nuestra API
// (ai/canal.logic.ts): /dashboard-app/lead devuelve `ventana` con el canal,
// sus horas, si esta abierta, hasta cuando y que se puede hacer fuera. Aqui,
// lo que dice la ficha. Funciones puras: ventana.spec.js.
//
// - WhatsApp: 24 h; fuera, una plantilla aprobada. Los textos de siempre.
// - Messenger e Instagram: 24 h; TikTok: 48 h. Fuera, nada: esperar a que el
//   lead escriba. Y el recordatorio de la visita, que alli es un texto en el
//   mismo chat, solo sale si a su hora la ventana sigue abierta.
import { cuandoVisita, textoVisita } from './leadApp';

const HORA_MS = 60 * 60 * 1000;

// "p. m." ya termina en punto.
const conPunto = texto => (texto.endsWith('.') ? texto : `${texto}.`);

/**
 * La ventana del chat. Con una API anterior a docs/21 § 4.2 solo llega
 * `ventana24h`: entonces es la de WhatsApp, como siempre.
 */
export function ventanaDe(lead) {
  if (lead?.ventana?.canal) return lead.ventana;
  return {
    canal: 'whatsapp',
    nombre: 'WhatsApp',
    horas: 24,
    abierta: !!lead?.ventana24h,
    ultimaEntrada: null,
    cierraEn: null,
    fuera: 'plantilla',
  };
}

/** Messenger, Instagram o TikTok. */
export const esRed = ventana => !!ventana && ventana.canal !== 'whatsapp';

/**
 * La linea de la ventana en la ficha: abierta, una linea discreta; cerrada,
 * un aviso con `titulo` en negrita y `texto`, que dice que se puede hacer en
 * ese canal.
 */
export function textoVentana(ventana, now = Date.now()) {
  if (!esRed(ventana)) {
    return ventana?.abierta
      ? {
          abierta: true,
          titulo: '',
          texto: 'Ventana de 24 h abierta: responder es gratis.',
        }
      : {
          abierta: false,
          titulo: 'Fuera de la ventana de 24 h.',
          texto:
            'Solo se puede escribir con una plantilla aprobada, y tiene coste.',
        };
  }
  const { nombre, horas } = ventana;
  if (ventana.abierta) {
    const hasta = ventana.cierraEn ? cuandoVisita(ventana.cierraEn, now) : '';
    return {
      abierta: true,
      titulo: '',
      texto: hasta
        ? conPunto(`Ventana de ${horas} h de ${nombre} abierta hasta ${hasta}`)
        : `Ventana de ${horas} h de ${nombre} abierta.`,
    };
  }
  return {
    abierta: false,
    titulo: `Fuera de la ventana de ${horas} h de ${nombre}.`,
    texto: `${nombre} no deja escribirle hasta que el lead vuelva a escribir.`,
  };
}

/** Si a esa hora se le podra escribir: antes de que se cierre la ventana. */
export function abiertaA(ventana, momento) {
  if (!ventana?.cierraEn || !momento) return false;
  return new Date(momento).getTime() < new Date(ventana.cierraEn).getTime();
}

/**
 * Que hacer para que el lead no se quede sin recordatorio (D3): pedirle su
 * WhatsApp o que confirme por el mismo chat. Si ya lo dio (el atributo
 * `whatsapp` del contacto, que guarda la IA), confirmarle por ahi.
 */
export function queHacer(whatsapp) {
  const numero = String(whatsapp ?? '').trim();
  return numero
    ? `Ya dio su WhatsApp (${numero}): confírmale la visita por ahí, o pídele que la confirme por este chat.`
    : 'Pídele su WhatsApp, o que confirme la visita por este chat.';
}

/**
 * El aviso del formulario de la visita para un lead de redes (D3): el
 * recordatorio puede no enviarse, por que y que hacer. Null en WhatsApp.
 */
export function avisoDeLaRed(ventana, whatsapp) {
  if (!esRed(ventana)) return null;
  return `El recordatorio puede no enviarse: ${ventana.nombre} solo deja escribirle hasta ${ventana.horas} h después de su último mensaje. ${queHacer(whatsapp)}`;
}

/** Cuando sale el recordatorio de una visita: su dia y hora, o tantas horas antes. */
export function salidaDelRecordatorio(v) {
  if (v?.reminderAt) return new Date(v.reminderAt);
  return new Date(
    new Date(v.scheduledAt).getTime() - (v.reminderHours || 2) * HORA_MS
  );
}

/**
 * El estado de la visita en una frase (textoVisita), dicho para el canal.
 * En WhatsApp, lo de siempre. En las redes:
 * - pendiente, si a su hora la ventana sigue abierta: le llegara por esa red;
 *   si no, no se promete (lo explica avisoDeLaVisita);
 * - fallido: "No se pudo enviar el recordatorio", con el motivo.
 */
export function textoDeLaVisita(v, ventana, now = Date.now()) {
  if (!v || !esRed(ventana)) return textoVisita(v);
  if (v.status === 'CONFIRMED' || v.status === 'RESCHEDULE_REQUESTED') {
    return textoVisita(v);
  }
  const { nombre } = ventana;
  if (v.reminderStatus === 'FAILED') {
    return conPunto(
      `No se pudo enviar el recordatorio: ${v.reminderError || 'sin detalle'}`
    );
  }
  if (v.reminderStatus !== 'PENDING') return textoVisita(v);
  const cuandoSale = v.reminderAt
    ? cuandoVisita(v.reminderAt, now)
    : `${v.reminderHours || 2} h antes`;
  return abiertaA(ventana, salidaDelRecordatorio(v))
    ? conPunto(`Le llegará un recordatorio por ${nombre} ${cuandoSale}`)
    : conPunto(`Recordatorio por ${nombre} ${cuandoSale}`);
}

/**
 * El aviso de D3 en la ficha, bajo la visita de un lead de redes, o null:
 * - pendiente y a su hora la ventana ya estara cerrada: puede no enviarse,
 *   por que y que hacer;
 * - no se pudo enviar: que hacer ahora.
 */
export function avisoDeLaVisita(v, ventana, whatsapp, now = Date.now()) {
  if (!v || !esRed(ventana)) return null;
  if (v.status === 'CONFIRMED' || v.status === 'RESCHEDULE_REQUESTED') {
    return null;
  }
  if (v.reminderStatus === 'FAILED') return queHacer(whatsapp);
  if (v.reminderStatus !== 'PENDING') return null;
  if (abiertaA(ventana, salidaDelRecordatorio(v))) return null;
  let cierre = '';
  if (ventana.cierraEn) {
    cierre = ` (${ventana.abierta ? 'se cierra' : 'se cerró'} ${cuandoVisita(ventana.cierraEn, now)})`;
  }
  return `Puede no enviarse: a esa hora ya habrá pasado la ventana de ${ventana.horas} h de ${ventana.nombre}${cierre}, y solo sale si el lead vuelve a escribir antes. ${queHacer(whatsapp)}`;
}
