// [turuta] Calculos de la pagina Propiedades, sin Vue, para poder probarlos.
// La API (dashboard-app/properties) da la union de las webs del cliente con lo
// que el equipo guardo por propiedad; aqui solo se filtra, se ordena y se
// prepara el formulario. Ver docs/16-manual-ia.md en crm-inmobi.

export const ESTADOS = ['disponible', 'reservado', 'vendido'];

/** Que contesta la IA si preguntan si el precio se negocia. Vacio: no se sabe. */
export const NEGOCIABLES = [
  { valor: '', texto: 'No se ha dicho' },
  { valor: 'si', texto: 'Sí' },
  { valor: 'ligeramente', texto: 'Ligeramente' },
  { valor: 'no', texto: 'No, precio fijo' },
];

const sinTildes = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Precio con su moneda, como se lee en una ficha. */
export function precioTexto(p) {
  if (!p || p.precio == null) return 'Sin precio';
  const simbolo = p.moneda === 'PEN' ? 'S/' : '$';
  const cifra = new Intl.NumberFormat('es-PE').format(p.precio);
  return `${simbolo} ${cifra}${p.periodo ? ` ${p.periodo}` : ''}`;
}

/** Una linea con lo que identifica la propiedad en la lista. */
export function subtitulo(p) {
  const partes = [p?.tipo, p?.distrito].filter(Boolean);
  const metros = p?.areaM2 ? `${p.areaM2} m²` : null;
  const dorm = p?.dormitorios ? `${p.dormitorios} dorm` : null;
  return [partes.join(' en '), dorm, metros].filter(Boolean).join(' · ');
}

/** De donde sale: la web, el codigo que usa el cliente y la direccion. */
export function origen(p) {
  return [p?.site, p?.codigo ? `codigo ${p.codigo}` : null, p?.direccion]
    .filter(Boolean)
    .join(' · ');
}

/** Lo que le falta a una propiedad para que la IA la mande completa. */
export function pendientes(p) {
  const falta = [];
  if (!p) return falta;
  if (p.fichaPorDefecto) falta.push('ficha generada');
  if (!p.videoUrl) falta.push('sin video');
  if (!p.horarioVisitas) falta.push('sin horario de visitas');
  return falta;
}

/** Filtra por web, por estado y por texto (titulo, distrito, direccion, codigo). */
export function filtrar(
  propiedades,
  { texto = '', site = '', estado = '' } = {}
) {
  const busca = sinTildes(texto).trim();
  return (propiedades || []).filter(p => {
    if (site && p.site !== site) return false;
    if (estado && p.disponibilidad !== estado) return false;
    if (!busca) return true;
    const heno = sinTildes(
      [p.titulo, p.distrito, p.direccion, p.codigo, p.tipo]
        .filter(Boolean)
        .join(' ')
    );
    return busca.split(/\s+/).every(palabra => heno.includes(palabra));
  });
}

/** Las que necesitan atencion primero, y dentro de cada grupo por distrito. */
export function ordenar(propiedades) {
  // Las que estan a medias arriba, las vendidas al final.
  const peso = p => {
    if (p.disponibilidad === 'vendido') return 2;
    return p.fichaPorDefecto ? 0 : 1;
  };
  return [...(propiedades || [])].sort((a, b) => {
    const d = peso(a) - peso(b);
    if (d) return d;
    return `${a.distrito}${a.titulo}`.localeCompare(
      `${b.distrito}${b.titulo}`,
      'es'
    );
  });
}

/** Cuantas hay de cada estado, y cuantas siguen con la ficha generada. */
export function resumen(propiedades) {
  const lista = propiedades || [];
  const cuenta = estado =>
    lista.filter(p => p.disponibilidad === estado).length;
  return {
    total: lista.length,
    disponibles: cuenta('disponible'),
    reservadas: cuenta('reservado'),
    vendidas: cuenta('vendido'),
    conFichaPropia: lista.filter(p => !p.fichaPorDefecto).length,
    conVideo: lista.filter(p => p.videoUrl).length,
  };
}

/** Los datos confirmados ({ piso: '7' }) como lista editable, en orden. */
export function datosALista(datos) {
  return Object.entries(datos || {})
    .map(([clave, valor]) => ({ clave, valor: String(valor) }))
    .sort((a, b) => a.clave.localeCompare(b.clave, 'es'));
}

/** La lista editable de vuelta a objeto. Se descartan las filas a medias. */
export function listaADatos(lista) {
  const salida = {};
  (lista || []).forEach(fila => {
    const clave = String(fila?.clave || '')
      .trim()
      .toLowerCase();
    const valor = String(fila?.valor || '').trim();
    if (clave && valor) salida[clave] = valor;
  });
  return salida;
}

/** El formulario que ve el equipo, a partir de la propiedad que da la API. */
export function formularioDe(p) {
  return {
    // Si la ficha es la generada, el campo va vacio: se ve de marca de agua y
    // solo se guarda si el equipo escribe la suya.
    ficha: p?.fichaPorDefecto ? '' : p?.ficha || '',
    videoUrl: p?.videoUrl || '',
    mapsUrl: p?.mapsUrl || '',
    visitHours: p?.horarioVisitas || '',
    availability: p?.disponibilidad || 'disponible',
    negotiable: p?.negociable || '',
    conditions: p?.condiciones || '',
    notes: p?.notas || '',
    datos: datosALista(p?.datos),
  };
}

const mismoTexto = (a, b) => String(a || '').trim() === String(b || '').trim();

/** Si el formulario trae algo distinto de lo guardado. */
export function hayCambios(form, p) {
  if (!form || !p) return false;
  const original = formularioDe(p);
  const camposTexto = [
    'ficha',
    'videoUrl',
    'mapsUrl',
    'visitHours',
    'availability',
    'negotiable',
    'conditions',
    'notes',
  ];
  if (camposTexto.some(c => !mismoTexto(form[c], original[c]))) return true;
  return (
    JSON.stringify(listaADatos(form.datos)) !==
    JSON.stringify(listaADatos(original.datos))
  );
}

/** El cuerpo del PUT. Se mandan todos los campos: el formulario los tiene todos. */
export function cuerpoDe(form, p, accountId, quien) {
  return {
    accountId: Number(accountId),
    site: p.site,
    propertyId: p.id,
    ficha: String(form.ficha || '').trim(),
    videoUrl: String(form.videoUrl || '').trim(),
    mapsUrl: String(form.mapsUrl || '').trim(),
    visitHours: String(form.visitHours || '').trim(),
    availability: String(form.availability || '').trim(),
    negotiable: String(form.negotiable || '').trim(),
    conditions: String(form.conditions || '').trim(),
    notes: String(form.notes || '').trim(),
    facts: listaADatos(form.datos),
    updatedBy: quien || '',
  };
}

/** Un aviso si la URL del video no parece un fichero que WhatsApp acepte. */
export function avisoDelVideo(url) {
  const v = String(url || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v))
    return 'El video tiene que ser una URL que empiece por https.';
  if (/youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com/i.test(v)) {
    return 'Enlaces de YouTube, Vimeo o Drive no se pueden mandar por WhatsApp: hace falta el enlace directo a un archivo .mp4.';
  }
  if (!/\.(mp4|3gp|mov)(\?|$)/i.test(v))
    return 'Lo normal es que acabe en .mp4.';
  return '';
}
