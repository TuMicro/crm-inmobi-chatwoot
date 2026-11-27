import {
  abiertaA,
  avisoDeLaRed,
  avisoDeLaVisita,
  esRed,
  queHacer,
  salidaDelRecordatorio,
  textoDeLaVisita,
  textoVentana,
  ventanaDe,
} from './ventana';

// En hora local, como cuandoVisita: el navegador del asesor esta en la zona
// del cliente. Sabado 21/11/2026, 10:00.
const AHORA = new Date(2026, 10, 21, 10, 0).getTime();
const horas = h => new Date(AHORA + h * 3600000).toISOString();

/** La ventana tal como la manda la API (docs/21 § 4.2 del repo crm-inmobi). */
const ventanaDeRed = (canal, nombre, horasDeVentana, cierraEnHoras) => ({
  canal,
  nombre,
  horas: horasDeVentana,
  abierta: cierraEnHoras > 0,
  ultimaEntrada: horas(cierraEnHoras - horasDeVentana),
  cierraEn: horas(cierraEnHoras),
  fuera: 'esperar',
});
const INSTAGRAM = ventanaDeRed('instagram', 'Instagram', 24, 6); // se cierra hoy a las 4 p. m.
const INSTAGRAM_CERRADA = ventanaDeRed('instagram', 'Instagram', 24, -2);
const TIKTOK = ventanaDeRed('tiktok', 'TikTok', 48, 30);

describe('ventanaDe', () => {
  it('la que manda la API', () => {
    expect(ventanaDe({ ventana: TIKTOK, ventana24h: true })).toBe(TIKTOK);
  });

  it('con una API anterior, la de WhatsApp con ventana24h', () => {
    expect(ventanaDe({ ventana24h: true })).toMatchObject({
      canal: 'whatsapp',
      horas: 24,
      abierta: true,
      fuera: 'plantilla',
    });
    expect(ventanaDe({ ventana24h: false }).abierta).toBe(false);
    expect(ventanaDe(null).canal).toBe('whatsapp');
  });

  it('esRed: todo menos WhatsApp', () => {
    expect(esRed(INSTAGRAM)).toBe(true);
    expect(esRed(ventanaDe({ ventana24h: true }))).toBe(false);
    expect(esRed(null)).toBe(false);
  });
});

describe('textoVentana', () => {
  it('WhatsApp: los textos de siempre', () => {
    expect(textoVentana(ventanaDe({ ventana24h: true }))).toEqual({
      abierta: true,
      titulo: '',
      texto: 'Ventana de 24 h abierta: responder es gratis.',
    });
    expect(textoVentana(ventanaDe({ ventana24h: false }))).toEqual({
      abierta: false,
      titulo: 'Fuera de la ventana de 24 h.',
      texto:
        'Solo se puede escribir con una plantilla aprobada, y tiene coste.',
    });
  });

  it('una red abierta dice hasta cuando, sin doble punto', () => {
    const { abierta, texto } = textoVentana(INSTAGRAM, AHORA);
    expect(abierta).toBe(true);
    expect(texto).toMatch(
      /^Ventana de 24 h de Instagram abierta hasta hoy 4:00 p\. m\.$/
    );
    expect(textoVentana(TIKTOK, AHORA).texto).toMatch(
      /^Ventana de 48 h de TikTok abierta hasta mañana 4:00 p/
    );
  });

  it('una red cerrada: no hay plantilla, hay que esperar a que escriba', () => {
    expect(textoVentana(INSTAGRAM_CERRADA, AHORA)).toEqual({
      abierta: false,
      titulo: 'Fuera de la ventana de 24 h de Instagram.',
      texto:
        'Instagram no deja escribirle hasta que el lead vuelva a escribir.',
    });
  });
});

describe('el recordatorio en las redes (D3)', () => {
  it('abiertaA: antes del cierre, si; despues o sin ventana, no', () => {
    expect(abiertaA(INSTAGRAM, horas(5))).toBe(true);
    expect(abiertaA(INSTAGRAM, horas(6))).toBe(false);
    expect(abiertaA({ cierraEn: null }, horas(1))).toBe(false);
  });

  it('cuando sale: su dia y hora, o tantas horas antes de la visita', () => {
    const visita = { scheduledAt: horas(10), reminderHours: 3 };
    expect(salidaDelRecordatorio(visita).toISOString()).toBe(horas(7));
    expect(
      salidaDelRecordatorio({ ...visita, reminderAt: horas(2) }).toISOString()
    ).toBe(horas(2));
    expect(
      salidaDelRecordatorio({ scheduledAt: horas(10) }).toISOString()
    ).toBe(horas(8));
  });

  it('que hacer: pedir su WhatsApp, o usar el que dio', () => {
    expect(queHacer('')).toBe(
      'Pídele su WhatsApp, o que confirme la visita por este chat.'
    );
    expect(queHacer('987654321')).toContain(
      'Ya dio su WhatsApp (987654321): confírmale la visita por ahí'
    );
  });

  it('el aviso del formulario: solo en las redes, con la red y sus horas', () => {
    expect(avisoDeLaRed(ventanaDe({ ventana24h: true }))).toBe(null);
    expect(avisoDeLaRed(TIKTOK)).toBe(
      'El recordatorio puede no enviarse: TikTok solo deja escribirle hasta 48 h después de su último mensaje. Pídele su WhatsApp, o que confirme la visita por este chat.'
    );
  });
});

describe('la visita en la ficha de un lead de redes', () => {
  const pendiente = h => ({
    status: 'SCHEDULED',
    reminderStatus: 'PENDING',
    scheduledAt: horas(h),
    reminderHours: 2,
  });

  it('en WhatsApp, lo de siempre y sin aviso', () => {
    const whatsapp = ventanaDe({ ventana24h: false });
    expect(textoDeLaVisita(pendiente(30), whatsapp)).toBe(
      'Le llegara un recordatorio por WhatsApp 2 h antes.'
    );
    expect(avisoDeLaVisita(pendiente(30), whatsapp)).toBe(null);
  });

  it('si a su hora la ventana sigue abierta, le llega por esa red', () => {
    expect(textoDeLaVisita(pendiente(7), INSTAGRAM, AHORA)).toBe(
      'Le llegará un recordatorio por Instagram 2 h antes.'
    );
    expect(avisoDeLaVisita(pendiente(7), INSTAGRAM, '', AHORA)).toBe(null);
  });

  it('si no, no se promete y se avisa: por que y que hacer', () => {
    expect(textoDeLaVisita(pendiente(30), INSTAGRAM, AHORA)).toBe(
      'Recordatorio por Instagram 2 h antes.'
    );
    const aviso = avisoDeLaVisita(pendiente(30), INSTAGRAM, '', AHORA);
    expect(aviso).toMatch(
      /^Puede no enviarse: a esa hora ya habrá pasado la ventana de 24 h de Instagram \(se cierra hoy 4:00 p\. m\.\), y solo sale si el lead vuelve a escribir antes\. Pídele su WhatsApp/
    );
    expect(
      avisoDeLaVisita(pendiente(30), INSTAGRAM_CERRADA, '', AHORA)
    ).toContain('(se cerró hoy 8:00 a. m.)');
  });

  it('con dia y hora dice cuando, sin doble punto', () => {
    const texto = textoDeLaVisita(
      { ...pendiente(30), reminderAt: horas(4) },
      INSTAGRAM,
      AHORA
    );
    expect(texto).toMatch(
      /^Le llegará un recordatorio por Instagram hoy 2:00 p\. m\.$/
    );
  });

  it('no se pudo enviar: el motivo, y que hacer', () => {
    const fallida = {
      status: 'SCHEDULED',
      reminderStatus: 'FAILED',
      reminderError:
        'Instagram solo deja escribirle hasta 24 h después de su último mensaje, y ya habían pasado',
    };
    expect(textoDeLaVisita(fallida, INSTAGRAM_CERRADA)).toBe(
      'No se pudo enviar el recordatorio: Instagram solo deja escribirle hasta 24 h después de su último mensaje, y ya habían pasado.'
    );
    expect(avisoDeLaVisita(fallida, INSTAGRAM_CERRADA, '987654321')).toMatch(
      /^Ya dio su WhatsApp \(987654321\)/
    );
  });

  it('enviado, confirmado o por reprogramar: como siempre, sin aviso', () => {
    const enviado = { status: 'SCHEDULED', reminderStatus: 'SENT' };
    expect(textoDeLaVisita(enviado, INSTAGRAM)).toMatch(/enviado/);
    expect(avisoDeLaVisita(enviado, INSTAGRAM)).toBe(null);
    const confirmada = { status: 'CONFIRMED', reminderStatus: 'FAILED' };
    expect(textoDeLaVisita(confirmada, INSTAGRAM)).toMatch(/Confirmada/);
    expect(avisoDeLaVisita(confirmada, INSTAGRAM)).toBe(null);
    expect(textoDeLaVisita(null, INSTAGRAM)).toBe('');
  });
});
