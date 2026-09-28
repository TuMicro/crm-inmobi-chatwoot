// [turuta] Calculos de la pagina Propiedades, sin Vue, para poder probarlos.
// La API (dashboard-app/properties) da la union de las webs del cliente con lo
// que el equipo guardo por propiedad; aqui solo se filtra, se ordena y se
// prepara el formulario. Ver docs/16-manual-ia.md en crm-inmobi.

export const ESTADOS = ['disponible', 'reservado', 'vendido', 'alquilado'];

export const ETIQUETA_ESTADO = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
  alquilado: 'Alquilado',
};

/**
 * Que hace cada estado. Ninguno toca la web del cliente: solo cambia lo que
 * hace la IA con la propiedad.
 */
export const QUE_HACE_EL_ESTADO = {
  '': 'Sigue a la «Situación» del panel de la web: si allí la marcan vendida o alquilada, aquí también.',
  disponible: 'La IA la ofrece y manda su ficha.',
  reservado:
    'Alguien la separó. La IA no la ofrece ni manda su ficha; si preguntan, dice que está reservada y ofrece parecidas.',
  vendido:
    'La IA no la ofrece ni manda su ficha; si preguntan, dice que se vendió y ofrece parecidas.',
  alquilado:
    'La IA no la ofrece ni manda su ficha; si preguntan, dice que ya se alquiló y ofrece parecidas.',
};

/** Las opciones del selector de estado. La primera sigue a la web. */
export function opcionesDeEstado(p) {
  const web = ETIQUETA_ESTADO[p?.disponibilidadWeb] || 'Disponible';
  return [
    { value: '', label: `Según la web (${web.toLowerCase()})` },
    ...ESTADOS.map(e => ({ value: e, label: ETIQUETA_ESTADO[e] })),
  ];
}

/** Que contesta la IA si preguntan si el precio se negocia. Vacio: no se sabe. */
export const NEGOCIABLES = [
  { value: '', label: 'No se ha dicho' },
  { value: 'si', label: 'Sí' },
  { value: 'ligeramente', label: 'Ligeramente' },
  { value: 'no', label: 'No, precio fijo' },
];

/** El texto del filtro por web: vacio es "Todas". */
export const textoDeWeb = site => site || 'Todas';

/**
 * Las webs para el bloque "Webs conectadas": las que hay en Supabase, y
 * tambien las conectadas que ya no estan, para poder quitarlas.
 */
export function websParaElegir(respuesta) {
  const conectadas = new Set(respuesta?.conectadas || []);
  const lista = (respuesta?.disponibles || []).map(w => ({
    ...w,
    conectada: conectadas.has(w.site),
  }));
  conectadas.forEach(site => {
    if (!lista.some(w => w.site === site)) {
      lista.push({
        site,
        nombre: site,
        publicadas: 0,
        ejemplos: [],
        conectada: true,
      });
    }
  });
  return lista;
}

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
  return [p?.site, p?.codigo ? `código ${p.codigo}` : null, p?.direccion]
    .filter(Boolean)
    .join(' · ');
}

/** El texto del aviso del video en la lista. */
function tituloDelVideo(p, conMacro) {
  if (conMacro) return 'Los archivos van en la macro';
  return p?.videoUrl ? 'Con video' : 'Sin video';
}

/**
 * Los tres avisos de la lista, como iconos: que manda la IA (ficha propia o
 * macro), si lleva video o macro, y si tiene horario de visitas.
 */
export function indicadores(p) {
  const conMacro = !!p?.macroId;
  const fichaGenerada = p?.fichaPorDefecto
    ? 'Ficha generada desde la web'
    : 'Ficha escrita por el equipo';
  return [
    {
      clave: 'ficha',
      icono: conMacro ? 'i-lucide-zap' : 'i-lucide-file-text',
      ok: conMacro || !p?.fichaPorDefecto,
      titulo: conMacro ? 'Manda una macro' : fichaGenerada,
    },
    {
      clave: 'video',
      icono: 'i-lucide-video',
      ok: conMacro || !!p?.videoUrl,
      titulo: tituloDelVideo(p, conMacro),
    },
    {
      clave: 'visitas',
      icono: 'i-lucide-calendar-clock',
      ok: !!p?.horarioVisitas,
      titulo: p?.horarioVisitas
        ? `Visitas: ${p.horarioVisitas}`
        : 'Sin horario de visitas',
    },
  ];
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
  // Las que estan a medias arriba, las que no estan disponibles al final.
  const peso = p => {
    if (p.disponibilidad !== 'disponible') return 2;
    return p.fichaPorDefecto && !p.macroId ? 0 : 1;
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

/** Cuantas hay de cada estado, y cuantas tienen ficha propia o macro. */
export function resumen(propiedades) {
  const lista = propiedades || [];
  return {
    total: lista.length,
    disponibles: lista.filter(p => p.disponibilidad === 'disponible').length,
    noDisponibles: lista.filter(p => p.disponibilidad !== 'disponible').length,
    conFichaPropia: lista.filter(p => !p.fichaPorDefecto || p.macroId).length,
    conMacroOVideo: lista.filter(p => p.videoUrl || p.macroId).length,
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

const limpio = v => String(v ?? '').trim();

/**
 * El formulario que ve el equipo, a partir de la propiedad que da la API.
 *
 * La ficha va escrita en el campo (la del equipo o, si no hay, la generada)
 * para poder retocar una parte. Si al guardar sigue igual que la generada, no
 * se guarda como propia: asi sigue a la web.
 */
export function formularioDe(p) {
  return {
    modo: p?.macroId ? 'macro' : 'ficha',
    ficha: p?.ficha || p?.fichaGenerada || '',
    videoUrl: p?.videoUrl || '',
    // Vacio: el mapa sale de la web. Asi guardar no congela la ubicacion.
    mapsUrl: p?.mapsUrlEquipo || '',
    visitHours: p?.horarioVisitas || '',
    // Vacio: sigue a la web. Asi guardar otro campo no congela el estado.
    availability: p?.disponibilidadEquipo || '',
    macroId: p?.macroId ? String(p.macroId) : '',
    negotiable: p?.negociable || '',
    conditions: p?.condiciones || '',
    notes: p?.notas || '',
    datos: datosALista(p?.datos),
  };
}

/** Si la ficha del formulario es la generada desde la web, tal cual. */
export const fichaEsGenerada = (form, p) =>
  limpio(form?.ficha) === limpio(p?.fichaGenerada);

/** Si el formulario trae algo distinto de lo guardado. */
export function hayCambios(form, p) {
  if (!form || !p) return false;
  const original = formularioDe(p);
  const campos = [
    'modo',
    'ficha',
    'videoUrl',
    'mapsUrl',
    'visitHours',
    'availability',
    'negotiable',
    'conditions',
    'notes',
  ];
  if (campos.some(c => limpio(form[c]) !== limpio(original[c]))) return true;
  if (
    form.modo === 'macro' &&
    limpio(form.macroId) !== limpio(original.macroId)
  )
    return true;
  return (
    JSON.stringify(listaADatos(form.datos)) !==
    JSON.stringify(listaADatos(original.datos))
  );
}

/** Lo que impide guardar, o '' si se puede. */
export function motivoParaNoGuardar(form) {
  if (form?.modo === 'macro' && !(Number(form.macroId) > 0)) {
    return 'Elige una macro, o vuelve a «Ficha y video».';
  }
  return '';
}

/** El cuerpo del PUT. Se mandan todos los campos: el formulario los tiene todos. */
export function cuerpoDe(form, p, accountId, quien) {
  const ficha = limpio(form.ficha);
  return {
    accountId: Number(accountId),
    site: p.site,
    propertyId: p.id,
    // Igual que la generada: no se guarda como propia, sigue a la web.
    ficha: ficha === limpio(p.fichaGenerada) ? '' : ficha,
    videoUrl: limpio(form.videoUrl),
    mapsUrl: limpio(form.mapsUrl),
    visitHours: limpio(form.visitHours),
    availability: limpio(form.availability),
    negotiable: limpio(form.negotiable),
    conditions: limpio(form.conditions),
    notes: limpio(form.notes),
    facts: listaADatos(form.datos),
    macroId:
      form.modo === 'macro' && Number(form.macroId) > 0
        ? Number(form.macroId)
        : null,
    updatedBy: quien || '',
  };
}

/** El nombre de un archivo a partir de su URL. */
export const nombreDeArchivo = url =>
  decodeURIComponent(
    String(url || '')
      .split('?')[0]
      .split('/')
      .pop() || 'archivo'
  );

/**
 * Lo que vera el lead, en orden, para la vista previa: en modo ficha, la
 * ficha, el video y la ubicacion; en modo macro, sus mensajes y archivos.
 */
export function vistaPrevia(form, p, macro) {
  if (form?.modo === 'macro') {
    return (macro?.pasos || []).map(paso =>
      paso.tipo === 'texto'
        ? { tipo: 'texto', texto: paso.texto }
        : { tipo: 'archivo', clase: paso.clase, nombre: paso.texto }
    );
  }
  const burbujas = [];
  const ficha = limpio(form?.ficha) || limpio(p?.fichaGenerada);
  if (ficha) burbujas.push({ tipo: 'texto', texto: ficha });
  if (limpio(form?.videoUrl)) {
    burbujas.push({
      tipo: 'archivo',
      clase: 'video',
      nombre: nombreDeArchivo(form.videoUrl),
    });
  }
  const mapa = limpio(form?.mapsUrl) || limpio(p?.mapsUrlWeb);
  if (mapa) burbujas.push({ tipo: 'texto', texto: `Ubicación: ${mapa}` });
  return burbujas;
}

/** El icono de un archivo segun su clase. */
export const ICONO_DE_ARCHIVO = {
  video: 'i-lucide-video',
  imagen: 'i-lucide-image',
  audio: 'i-lucide-audio-lines',
  documento: 'i-lucide-file-text',
};

/** Un aviso si la URL del video no parece un fichero que WhatsApp acepte. */
export function avisoDelVideo(url) {
  const v = limpio(url);
  if (!v) return '';
  if (!/^https?:\/\//i.test(v))
    return 'El video tiene que ser una URL que empiece por https.';
  if (/youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com/i.test(v)) {
    return 'WhatsApp no acepta enlaces de YouTube, Vimeo o Drive: hace falta el enlace directo a un archivo .mp4.';
  }
  if (!/\.(mp4|3gp|mov)(\?|$)/i.test(v))
    return 'Lo normal es que acabe en .mp4.';
  return '';
}
