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

/** "a, b y c". */
export function enumerar(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

const cuantos = (n, uno, varios) => (n === 1 ? uno : `${n} ${varios}`);

/** Lo que va con la ficha, contado: ['3 fotos', 'un video', 'un mensaje']. */
export function adjuntosDe(p) {
  const archivos = p?.archivos || [];
  const de = tipo => archivos.filter(a => a.tipo === tipo).length;
  const partes = [];
  if (de('imagen')) partes.push(cuantos(de('imagen'), 'una foto', 'fotos'));
  if (de('video')) partes.push(cuantos(de('video'), 'un video', 'videos'));
  if (de('documento')) partes.push(cuantos(de('documento'), 'un PDF', 'PDF'));
  const textos = (p?.piezas || []).filter(
    x => x.tipo === 'texto' && String(x.texto || '').trim()
  ).length;
  if (textos) partes.push(cuantos(textos, 'un mensaje', 'mensajes'));
  return partes;
}

/** El texto del aviso de los archivos en la lista. */
function tituloDeArchivos(p, conMacro) {
  if (conMacro) return 'Los archivos van en la macro';
  const partes = adjuntosDe(p);
  return partes.length
    ? `Con ${enumerar(partes)}`
    : 'Sin fotos, videos ni mensajes';
}

/**
 * Los tres avisos de la lista, como iconos: que manda la IA (ficha propia o
 * macro), si lleva archivos o macro, y si tiene horario de visitas.
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
      clave: 'archivos',
      icono: 'i-lucide-images',
      ok: conMacro || adjuntosDe(p).length > 0,
      titulo: tituloDeArchivos(p, conMacro),
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
    conMacroOArchivos: lista.filter(p => adjuntosDe(p).length || p.macroId)
      .length,
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
    ficha: p?.ficha || p?.fichaGenerada || '',
    // Lo que va tras la ficha (archivos, textos, la ubicacion) no esta aqui:
    // se guarda al momento, pieza a pieza.
    visitHours: p?.horarioVisitas || '',
    // Vacio: sigue a la web. Asi guardar otro campo no congela el estado.
    availability: p?.disponibilidadEquipo || '',
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
    'ficha',
    'visitHours',
    'availability',
    'negotiable',
    'conditions',
    'notes',
  ];
  if (campos.some(c => limpio(form[c]) !== limpio(original[c]))) return true;
  return (
    JSON.stringify(listaADatos(form.datos)) !==
    JSON.stringify(listaADatos(original.datos))
  );
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
    visitHours: limpio(form.visitHours),
    availability: limpio(form.availability),
    negotiable: limpio(form.negotiable),
    conditions: limpio(form.conditions),
    notes: limpio(form.notes),
    facts: listaADatos(form.datos),
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

/** Si un enlace apunta directo a un archivo: entonces se manda como archivo. */
export const esArchivoDirecto = url =>
  /\.(mp4|3gp|jpe?g|png|pdf)$/i.test(String(url || '').split(/[?#]/)[0]);

function claseDeEnlace(url) {
  const ruta = String(url || '').split(/[?#]/)[0];
  if (/\.(mp4|3gp)$/i.test(ruta)) return 'video';
  if (/\.(jpe?g|png)$/i.test(ruta)) return 'imagen';
  return 'documento';
}

/**
 * Lo que vera el lead, en orden, para la vista previa: la ficha y lo que va
 * detras (archivos, textos, la ubicacion). Como lo manda la IA
 * (pasosTrasLaFicha en la API). `borradores` son los textos que se estan
 * escribiendo, por id.
 */
export function vistaPrevia(form, p, borradores = {}) {
  const burbujas = [];
  const ficha = limpio(form?.ficha) || limpio(p?.fichaGenerada);
  if (ficha) burbujas.push({ tipo: 'texto', texto: ficha });
  (p?.piezas || []).forEach(pieza => {
    if (pieza.tipo === 'texto') {
      const texto = limpio(borradores[pieza.id] ?? pieza.texto);
      if (!texto) return;
      if (/^https?:\/\/\S+$/i.test(texto) && esArchivoDirecto(texto)) {
        burbujas.push({
          tipo: 'archivo',
          clase: claseDeEnlace(texto),
          nombre: nombreDeArchivo(texto),
          url: null,
        });
      } else {
        burbujas.push({ tipo: 'texto', texto });
      }
    } else if (pieza.tipo === 'ubicacion') {
      if (p.mapsUrl)
        burbujas.push({ tipo: 'texto', texto: `Ubicación: ${p.mapsUrl}` });
    } else {
      burbujas.push({
        tipo: 'archivo',
        clase: pieza.tipo,
        nombre: pieza.nombre,
        url: pieza.url || null,
      });
    }
  });
  return burbujas;
}

/** El icono de un archivo segun su clase. */
export const ICONO_DE_ARCHIVO = {
  texto: 'i-lucide-message-square',
  ubicacion: 'i-lucide-map-pin',
  video: 'i-lucide-video',
  imagen: 'i-lucide-image',
  audio: 'i-lucide-audio-lines',
  documento: 'i-lucide-file-text',
};

/** 850 KB, 4.2 MB */
export function tamanoLegible(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Archivos por propiedad. El mismo limite que la API (medios.logic.ts). */
export const MAX_ARCHIVOS = 10;
/** Todo lo que va tras la ficha (archivos, textos, la ubicacion). Como la API. */
export const MAX_PIEZAS = 15;

const MB = 1024 * 1024;
const SUBIDA_MAX = { imagen: 25 * MB, video: 500 * MB, documento: 40 * MB };

/**
 * Lo que deja elegir el selector de archivos. Con las extensiones además de
 * los tipos: Windows no siempre sabe que .webp es image/webp, y entonces el
 * selector no enseñaba esas fotos (30/09).
 */
export const ACEPTA_ARCHIVOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  'video/*',
  '.mp4',
  '.mov',
  '.m4v',
  '.3gp',
  '.webm',
  '.mkv',
  '.avi',
  'application/pdf',
  '.pdf',
].join(',');

export const ETIQUETA_TIPO = {
  imagen: 'Foto',
  video: 'Video',
  documento: 'PDF',
};

/** imagen, video o documento (PDF); null si WhatsApp no lo acepta. */
export function tipoDeArchivo(archivo) {
  const nombre = String(archivo?.name || '');
  const t = String(archivo?.type || '').toLowerCase();
  if (/\.pdf$/i.test(nombre) || t === 'application/pdf') return 'documento';
  if (
    /\.(jpe?g|png|webp)$/i.test(nombre) ||
    ['image/jpeg', 'image/png', 'image/webp'].includes(t)
  )
    return 'imagen';
  if (
    /\.(mp4|m4v|mov|3gp|webm|mkv|avi)$/i.test(nombre) ||
    t.startsWith('video/')
  )
    return 'video';
  return null;
}

/**
 * Si un archivo elegido en la PC se puede subir, o por que no. Lo mismo que
 * comprueba la API, antes de subir nada. Un video pesado si se puede: la API
 * lo comprime por debajo de los 16 MB de WhatsApp.
 */
export function problemaConElArchivo(archivo, yaHay = 0) {
  if (!archivo) return 'No se eligió ningún archivo.';
  const nombre = String(archivo.name || '');
  if (
    /\.(heic|heif)$/i.test(nombre) ||
    /image\/hei[cf]/i.test(archivo.type || '')
  ) {
    return 'Las fotos HEIC del iPhone no se pueden mandar por WhatsApp: expórtala como JPG y súbela otra vez.';
  }
  const tipo = tipoDeArchivo(archivo);
  if (!tipo)
    return 'Por WhatsApp se pueden mandar fotos (JPG, PNG), videos y PDF. Ese archivo no.';
  if (!archivo.size) return 'El archivo está vacío.';
  if (yaHay >= MAX_ARCHIVOS)
    return `Ya hay ${MAX_ARCHIVOS} archivos: quita alguno antes de subir otro.`;
  if (archivo.size > SUBIDA_MAX[tipo]) {
    const pesa = `Pesa ${tamanoLegible(archivo.size)}`;
    if (tipo === 'video')
      return `${pesa} y el máximo es 500 MB. Recórtalo, o súbelo a YouTube y pega el enlace.`;
    if (tipo === 'documento')
      return `${pesa} y el máximo para un PDF es 40 MB.`;
    return `${pesa} y el máximo para una foto es 25 MB.`;
  }
  return '';
}

/**
 * La caja «Macro para los asesores» de la pestaña Ficha y archivos: lo que
 * dice y los botones. `macros` es la lista de la cuenta (para el nombre). Con
 * cambios sin guardar se puede pulsar igual: se guardan antes. Si la macro ya
 * no está al día, el equipo elige: actualizar esa o crear otra.
 */
export function estadoMacroAsesores(p, { macros = [], sinGuardar, subiendo }) {
  const motivo = subiendo ? 'Espera a que terminen de subir los archivos.' : '';
  const antes = sinGuardar ? ' Los cambios sin guardar se guardan antes.' : '';
  if (!p?.macroAsesoresId) {
    return {
      titulo: 'Macro para los asesores',
      detalle: `Guarda esto mismo como una macro de Chatwoot, para mandarlo a mano desde un chat.${antes}`,
      acciones: [
        { clave: 'crear', label: 'Guardar como macro', destacado: true },
      ],
      motivo,
    };
  }
  const macro = macros.find(m => String(m.id) === String(p.macroAsesoresId));
  const titulo = macro ? `Macro «${macro.nombre}»` : 'Macro para los asesores';
  if (p.macroAsesoresAlDia && !sinGuardar) {
    return {
      titulo,
      detalle: 'Al día: manda lo mismo que la IA.',
      acciones: [
        {
          clave: 'nueva',
          label: 'Copiar en una nueva macro',
          destacado: false,
        },
      ],
      motivo,
    };
  }
  return {
    titulo,
    detalle: sinGuardar
      ? 'Hay cambios sin guardar. ¿Los pasas a esta macro o creas otra? Se guardan antes.'
      : 'Cambió la ficha o lo que va detrás. ¿Actualizas esta macro o creas otra?',
    acciones: [
      {
        clave: 'actualizar',
        label: 'Guardar cambios en la misma macro',
        destacado: true,
      },
      {
        clave: 'nueva',
        label: 'Guardar cambios en una nueva macro',
        destacado: false,
      },
    ],
    motivo,
  };
}

/** Una macro en una linea, para elegirla: «2 mensajes · un archivo · además: nota privada». */
export function resumenCortoDeMacro(m) {
  const pasos = m?.pasos || [];
  const textos = pasos.filter(x => x.tipo === 'texto').length;
  const archivos = pasos.length - textos;
  const partes = [];
  if (textos) partes.push(cuantos(textos, 'un mensaje', 'mensajes'));
  if (archivos) partes.push(cuantos(archivos, 'un archivo', 'archivos'));
  if (!partes.length) partes.push('no manda mensajes');
  const ademas = m?.ignoradas || [];
  if (ademas.length) partes.push(`además: ${ademas.join(', ')}`);
  return partes.join(' · ');
}
