import {
  avisoDelVideo,
  cuerpoDe,
  datosALista,
  fichaEsGenerada,
  filtrar,
  formularioDe,
  hayCambios,
  indicadores,
  listaADatos,
  motivoParaNoGuardar,
  nombreDeArchivo,
  opcionesDeEstado,
  ordenar,
  origen,
  precioTexto,
  problemaConElVideo,
  resumen,
  subtitulo,
  tamanoLegible,
  textoDeWeb,
  vistaPrevia,
  websParaElegir,
} from './propiedades';

const prop = (extra = {}) => ({
  id: 'p1',
  site: 'madhouse',
  titulo: 'Dúplex con doble altura',
  tipo: 'Departamento',
  distrito: 'San Isidro',
  direccion: 'Av. Camino Real 123',
  codigo: 'MH-7',
  precio: 298000,
  moneda: 'USD',
  periodo: null,
  dormitorios: 3,
  areaM2: 168,
  disponibilidad: 'disponible',
  disponibilidadWeb: 'disponible',
  disponibilidadEquipo: null,
  ficha: 'FICHA GENERADA',
  fichaGenerada: 'FICHA GENERADA',
  fichaPorDefecto: true,
  videoUrl: null,
  mapsUrl: 'https://maps.google.com/?q=1,2',
  mapsUrlWeb: 'https://maps.google.com/?q=1,2',
  mapsUrlEquipo: null,
  horarioVisitas: null,
  negociable: null,
  condiciones: null,
  notas: null,
  datos: {},
  macroId: null,
  ...extra,
});

describe('textos de la lista', () => {
  it('precio con moneda y miles', () => {
    expect(precioTexto(prop())).toBe('$ 298,000');
    expect(
      precioTexto(prop({ moneda: 'PEN', precio: 1500, periodo: 'mensual' }))
    ).toBe('S/ 1,500 mensual');
    expect(precioTexto(prop({ precio: null }))).toBe('Sin precio');
  });

  it('subtitulo y origen', () => {
    expect(subtitulo(prop())).toBe(
      'Departamento en San Isidro · 3 dorm · 168 m²'
    );
    expect(origen(prop())).toBe('madhouse · código MH-7 · Av. Camino Real 123');
  });

  it('el filtro sin web se llama Todas', () => {
    expect(textoDeWeb('')).toBe('Todas');
    expect(textoDeWeb('madhouse')).toBe('madhouse');
  });
});

describe('indicadores', () => {
  it('sin nada propio, los tres apagados', () => {
    expect(indicadores(prop()).map(i => i.ok)).toEqual([false, false, false]);
  });

  it('con ficha propia, video y horario, encendidos', () => {
    const i = indicadores(
      prop({
        fichaPorDefecto: false,
        videoUrl: 'https://x/v.mp4',
        horarioVisitas: '11 a 13',
      })
    );
    expect(i.map(x => x.ok)).toEqual([true, true, true]);
    expect(i[2].titulo).toBe('Visitas: 11 a 13');
  });

  it('con macro, ficha y archivos cuentan como resueltos', () => {
    const i = indicadores(prop({ macroId: 7 }));
    expect(i[0]).toMatchObject({ ok: true, icono: 'i-lucide-zap' });
    expect(i[1].ok).toBe(true);
  });
});

describe('estado y webs', () => {
  it('la primera opcion sigue a la web y dice que marca la web', () => {
    const o = opcionesDeEstado(prop({ disponibilidadWeb: 'alquilado' }));
    expect(o[0]).toEqual({ value: '', label: 'Según la web (alquilado)' });
    expect(o.map(x => x.value)).toEqual([
      '',
      'disponible',
      'reservado',
      'vendido',
      'alquilado',
    ]);
  });

  it('las webs para elegir marcan las conectadas y conservan las que ya no existen', () => {
    const w = websParaElegir({
      conectadas: ['joserojas', 'vieja'],
      disponibles: [
        {
          site: 'joserojas',
          nombre: 'José Rojas',
          publicadas: 5,
          ejemplos: [],
        },
        { site: 'madhouse', nombre: 'Madhouse', publicadas: 5, ejemplos: [] },
      ],
    });
    expect(w.map(x => [x.site, x.conectada])).toEqual([
      ['joserojas', true],
      ['madhouse', false],
      ['vieja', true],
    ]);
  });
});

describe('filtrar, ordenar y resumir', () => {
  const lista = [
    prop({ id: 'a', distrito: 'Barranco', titulo: 'Dúplex frente al mar' }),
    prop({
      id: 'b',
      site: 'joserojas',
      distrito: 'San Isidro',
      disponibilidad: 'alquilado',
    }),
    prop({ id: 'c', distrito: 'Miraflores', fichaPorDefecto: false }),
  ];

  it('por web, estado y texto sin tildes', () => {
    expect(filtrar(lista, { site: 'joserojas' }).map(p => p.id)).toEqual(['b']);
    expect(filtrar(lista, { estado: 'alquilado' }).map(p => p.id)).toEqual([
      'b',
    ]);
    expect(filtrar(lista, { texto: 'duplex mar' }).map(p => p.id)).toEqual([
      'a',
    ]);
    expect(filtrar(lista, { texto: 'surco' })).toEqual([]);
  });

  it('primero las que tienen la ficha generada, al final las no disponibles', () => {
    expect(ordenar(lista).map(p => p.id)).toEqual(['a', 'c', 'b']);
  });

  it('el resumen cuenta disponibles, no disponibles, fichas propias y macros o videos', () => {
    expect(resumen([...lista, prop({ macroId: 3 })])).toEqual({
      total: 4,
      disponibles: 3,
      noDisponibles: 1,
      conFichaPropia: 2,
      conMacroOVideo: 1,
    });
  });
});

describe('los datos confirmados', () => {
  it('van y vuelven de objeto a lista, en orden y sin filas a medias', () => {
    expect(datosALista({ piso: '7', mantenimiento: '350 soles' })).toEqual([
      { clave: 'mantenimiento', valor: '350 soles' },
      { clave: 'piso', valor: '7' },
    ]);
    expect(
      listaADatos([
        { clave: ' Piso ', valor: ' 7 ' },
        { clave: '', valor: 'x' },
        { clave: 'año', valor: '' },
      ])
    ).toEqual({ piso: '7' });
  });
});

describe('el formulario', () => {
  it('la ficha va escrita en el campo, no de marca de agua', () => {
    expect(formularioDe(prop()).ficha).toBe('FICHA GENERADA');
    expect(
      formularioDe(prop({ fichaPorDefecto: false, ficha: 'La mía' })).ficha
    ).toBe('La mía');
  });

  it('estado y ubicacion siguen a la web salvo que el equipo los haya puesto', () => {
    const f = formularioDe(prop());
    expect(f.availability).toBe('');
    expect(f.mapsUrl).toBe('');
    expect(
      formularioDe(prop({ disponibilidadEquipo: 'reservado' })).availability
    ).toBe('reservado');
  });

  it('el modo sale de si hay macro', () => {
    expect(formularioDe(prop()).modo).toBe('ficha');
    expect(formularioDe(prop({ macroId: 7 }))).toMatchObject({
      modo: 'macro',
      macroId: '7',
    });
  });

  it('sabe si hay algo sin guardar', () => {
    const p = prop();
    const form = formularioDe(p);
    expect(hayCambios(form, p)).toBe(false);
    expect(hayCambios({ ...form, visitHours: '11 a 13' }, p)).toBe(true);
    expect(
      hayCambios({ ...form, ficha: 'FICHA GENERADA\nY algo más' }, p)
    ).toBe(true);
    expect(hayCambios({ ...form, modo: 'macro', macroId: '7' }, p)).toBe(true);
    // Elegir una macro en la otra pestaña sin cambiar de modo no cuenta.
    expect(hayCambios({ ...form, macroId: '7' }, p)).toBe(false);
  });

  it('sabe si la ficha es la generada', () => {
    const p = prop();
    expect(fichaEsGenerada(formularioDe(p), p)).toBe(true);
    expect(fichaEsGenerada({ ficha: 'otra' }, p)).toBe(false);
  });

  it('en modo macro hay que elegir una', () => {
    expect(motivoParaNoGuardar({ modo: 'ficha' })).toBe('');
    expect(motivoParaNoGuardar({ modo: 'macro', macroId: '' })).toMatch(
      /Elige una macro/
    );
    expect(motivoParaNoGuardar({ modo: 'macro', macroId: '3' })).toBe('');
  });

  it('el cuerpo del PUT: la ficha igual a la generada no se guarda como propia', () => {
    const p = prop();
    const form = {
      ...formularioDe(p),
      visitHours: ' 11 a 13 ',
      datos: [{ clave: 'piso', valor: '7' }],
    };
    expect(cuerpoDe(form, p, '1', 'Kefrin')).toEqual({
      accountId: 1,
      site: 'madhouse',
      propertyId: 'p1',
      ficha: '',
      videoUrl: '',
      mapsUrl: '',
      visitHours: '11 a 13',
      availability: '',
      negotiable: '',
      conditions: '',
      notes: '',
      facts: { piso: '7' },
      macroId: null,
      updatedBy: 'Kefrin',
    });
    expect(cuerpoDe({ ...form, ficha: 'La mía' }, p, '1', '').ficha).toBe(
      'La mía'
    );
  });

  it('la macro solo se guarda en modo macro', () => {
    const p = prop();
    const f = { ...formularioDe(p), macroId: '12' };
    expect(cuerpoDe(f, p, '1', '').macroId).toBeNull();
    expect(cuerpoDe({ ...f, modo: 'macro' }, p, '1', '').macroId).toBe(12);
  });
});

describe('vistaPrevia', () => {
  it('en modo ficha: la ficha, el video y la ubicacion de la web', () => {
    const p = prop();
    const v = vistaPrevia(
      { ...formularioDe(p), videoUrl: 'https://x/tour%20dia.mp4' },
      p
    );
    expect(v).toEqual([
      { tipo: 'texto', texto: 'FICHA GENERADA' },
      { tipo: 'archivo', clase: 'video', nombre: 'tour dia.mp4' },
      { tipo: 'texto', texto: 'Ubicación: https://maps.google.com/?q=1,2' },
    ]);
  });

  it('en modo macro: sus pasos', () => {
    const macro = {
      pasos: [
        { tipo: 'texto', texto: 'Hola' },
        { tipo: 'archivo', texto: 'plano.pdf', clase: 'documento' },
      ],
    };
    expect(vistaPrevia({ modo: 'macro' }, prop(), macro)).toEqual([
      { tipo: 'texto', texto: 'Hola' },
      { tipo: 'archivo', clase: 'documento', nombre: 'plano.pdf' },
    ]);
    expect(vistaPrevia({ modo: 'macro' }, prop(), null)).toEqual([]);
  });

  it('el nombre del archivo sale de la URL', () => {
    expect(nombreDeArchivo('https://x/a/b/video.mp4?t=1')).toBe('video.mp4');
  });
});

describe('el video subido', () => {
  it('el formulario lleva el enlace pegado, no la URL firmada del subido', () => {
    const p = prop({
      videoUrl: 'https://storage/firmada?X-Amz-Signature=abc',
      videoEnlace: null,
      videoSubido: {
        clave: 'crm/v.mp4',
        nombre: 'recorrido.mp4',
        bytes: 4_000_000,
      },
    });
    expect(formularioDe(p).videoUrl).toBe('');
  });

  it('en la vista previa manda el subido sobre el enlace', () => {
    const p = prop({
      videoSubido: { clave: 'k', nombre: 'recorrido.mp4', bytes: 1 },
    });
    const v = vistaPrevia(
      { ...formularioDe(p), videoUrl: 'https://x/otro.mp4' },
      p
    );
    expect(v[1]).toEqual({
      tipo: 'archivo',
      clase: 'video',
      nombre: 'recorrido.mp4',
    });
  });

  it('solo MP4 o 3GP hasta 16 MB, antes de subir nada', () => {
    const mb = n => n * 1024 * 1024;
    expect(
      problemaConElVideo({ name: 'a.mp4', type: 'video/mp4', size: mb(5) })
    ).toBe('');
    expect(problemaConElVideo({ name: 'a.3gp', type: '', size: mb(1) })).toBe(
      ''
    );
    expect(
      problemaConElVideo({
        name: 'a.mov',
        type: 'video/quicktime',
        size: mb(5),
      })
    ).toMatch(/MP4 o 3GP/);
    expect(
      problemaConElVideo({ name: 'a.mp4', type: 'video/mp4', size: mb(20) })
    ).toMatch(/Pesa 20.0 MB/);
    expect(problemaConElVideo(null)).toMatch(/ningún archivo/);
  });

  it('tamanoLegible', () => {
    expect(tamanoLegible(850 * 1024)).toBe('850 KB');
    expect(tamanoLegible(4.2 * 1024 * 1024)).toBe('4.2 MB');
  });
});

describe('avisoDelVideo', () => {
  it('avisa de los enlaces que WhatsApp no acepta', () => {
    expect(avisoDelVideo('')).toBe('');
    expect(avisoDelVideo('https://x.com/v.mp4')).toBe('');
    expect(avisoDelVideo('v.mp4')).toMatch(/empiece por https/);
    expect(avisoDelVideo('https://youtu.be/abc')).toMatch(/YouTube/);
    expect(avisoDelVideo('https://x.com/v.avi')).toMatch(/\.mp4/);
  });
});
