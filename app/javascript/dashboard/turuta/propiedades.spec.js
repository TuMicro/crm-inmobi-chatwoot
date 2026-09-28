import {
  ACEPTA_ARCHIVOS,
  adjuntosDe,
  estadoMacroAsesores,
  resumenCortoDeMacro,
  cuerpoDe,
  datosALista,
  fichaEsGenerada,
  filtrar,
  formularioDe,
  hayCambios,
  indicadores,
  listaADatos,
  nombreDeArchivo,
  opcionesDeEstado,
  ordenar,
  origen,
  precioTexto,
  problemaConElArchivo,
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
  archivos: [],
  piezas: [],
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

  it('con ficha propia, archivos y horario, encendidos', () => {
    const i = indicadores(
      prop({
        fichaPorDefecto: false,
        archivos: [{ id: 'a', tipo: 'video', nombre: 'v.mp4' }],
        piezas: [{ id: 't', tipo: 'texto', texto: 'https://youtu.be/x' }],
        horarioVisitas: '11 a 13',
      })
    );
    expect(i.map(x => x.ok)).toEqual([true, true, true]);
    expect(i[1].titulo).toBe('Con un video y un mensaje');
    expect(i[2].titulo).toBe('Visitas: 11 a 13');
    expect(indicadores(prop())[1].titulo).toBe('Sin fotos, videos ni mensajes');
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

  it('el resumen cuenta disponibles, no disponibles, fichas propias y macros o archivos', () => {
    expect(resumen([...lista, prop({ macroId: 3 })])).toEqual({
      total: 4,
      disponibles: 3,
      noDisponibles: 1,
      conFichaPropia: 2,
      conMacroOArchivos: 1,
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

  it('el estado sigue a la web salvo que el equipo lo haya puesto', () => {
    const f = formularioDe(prop());
    expect(f.availability).toBe('');
    expect(f).not.toHaveProperty('mapsUrl');
    expect(
      formularioDe(prop({ disponibilidadEquipo: 'reservado' })).availability
    ).toBe('reservado');
  });

  it('no tiene modo ni macro: la pestaña Macro ya no existe', () => {
    expect(formularioDe(prop({ macroId: 7 }))).not.toHaveProperty('modo');
    expect(formularioDe(prop({ macroId: 7 }))).not.toHaveProperty('macroId');
  });

  it('sabe si hay algo sin guardar', () => {
    const p = prop();
    const form = formularioDe(p);
    expect(hayCambios(form, p)).toBe(false);
    expect(hayCambios({ ...form, visitHours: '11 a 13' }, p)).toBe(true);
    expect(
      hayCambios({ ...form, ficha: 'FICHA GENERADA\nY algo más' }, p)
    ).toBe(true);
  });

  it('sabe si la ficha es la generada', () => {
    const p = prop();
    expect(fichaEsGenerada(formularioDe(p), p)).toBe(true);
    expect(fichaEsGenerada({ ficha: 'otra' }, p)).toBe(false);
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
      visitHours: '11 a 13',
      availability: '',
      negotiable: '',
      conditions: '',
      notes: '',
      facts: { piso: '7' },
      updatedBy: 'Kefrin',
    });
    expect(cuerpoDe({ ...form, ficha: 'La mía' }, p, '1', '').ficha).toBe(
      'La mía'
    );
  });
});

describe('vistaPrevia', () => {
  it('la ficha y lo que va detras, en su orden', () => {
    const p = prop({
      piezas: [
        { id: 'u', tipo: 'ubicacion' },
        { id: 'a', tipo: 'imagen', nombre: 'sala.jpg', url: 'https://f/1' },
        { id: 't', tipo: 'texto', texto: 'https://youtu.be/abc' },
        { id: 'v', tipo: 'texto', texto: '  ' },
        { id: 'b', tipo: 'documento', nombre: 'plano.pdf', url: null },
      ],
    });
    expect(vistaPrevia(formularioDe(p), p)).toEqual([
      { tipo: 'texto', texto: 'FICHA GENERADA' },
      { tipo: 'texto', texto: 'Ubicación: https://maps.google.com/?q=1,2' },
      {
        tipo: 'archivo',
        clase: 'imagen',
        nombre: 'sala.jpg',
        url: 'https://f/1',
      },
      { tipo: 'texto', texto: 'https://youtu.be/abc' },
      { tipo: 'archivo', clase: 'documento', nombre: 'plano.pdf', url: null },
    ]);
  });

  it('con lo que se esta escribiendo, y un enlace directo a un mp4 como archivo', () => {
    const p = prop({
      piezas: [{ id: 't', tipo: 'texto', texto: 'viejo' }],
      mapsUrl: null,
    });
    expect(
      vistaPrevia(formularioDe(p), p, {
        t: 'https://x/tour%20dia.mp4',
      })[1]
    ).toEqual({
      tipo: 'archivo',
      clase: 'video',
      nombre: 'tour dia.mp4',
      url: null,
    });
    // Sin mapa, la ubicacion no se manda.
    expect(
      vistaPrevia(formularioDe(p), {
        ...p,
        piezas: [{ id: 'u', tipo: 'ubicacion' }],
      })
    ).toHaveLength(1);
  });

  it('el nombre del archivo sale de la URL', () => {
    expect(nombreDeArchivo('https://x/a/b/video.mp4?t=1')).toBe('video.mp4');
  });
});

describe('los archivos', () => {
  it('cuenta lo que va con la ficha', () => {
    expect(adjuntosDe(prop())).toEqual([]);
    expect(
      adjuntosDe(
        prop({
          archivos: [
            { tipo: 'imagen' },
            { tipo: 'imagen' },
            { tipo: 'video' },
            { tipo: 'documento' },
          ],
          piezas: [
            { id: 't', tipo: 'texto', texto: 'https://y' },
            { id: 'v', tipo: 'texto', texto: ' ' },
            { id: 'u', tipo: 'ubicacion' },
          ],
        })
      )
    ).toEqual(['2 fotos', 'un video', 'un PDF', 'un mensaje']);
  });

  it('fotos, videos y PDF; un video pesado si, porque se comprime', () => {
    const mb = n => n * 1024 * 1024;
    const f = (name, type, size) => ({ name, type, size });
    expect(problemaConElArchivo(f('a.mp4', 'video/mp4', mb(82)))).toBe('');
    expect(problemaConElArchivo(f('a.MOV', 'video/quicktime', mb(5)))).toBe('');
    expect(problemaConElArchivo(f('a.jpg', 'image/jpeg', mb(3)))).toBe('');
    expect(problemaConElArchivo(f('a.pdf', '', mb(3)))).toBe('');
    expect(problemaConElArchivo(f('a.mp4', 'video/mp4', mb(600)))).toMatch(
      /500 MB.*YouTube/
    );
    expect(problemaConElArchivo(f('a.pdf', 'application/pdf', mb(41)))).toMatch(
      /40 MB/
    );
    expect(problemaConElArchivo(f('IMG.HEIC', 'image/heic', mb(2)))).toMatch(
      /HEIC/
    );
    expect(problemaConElArchivo(f('a.zip', 'application/zip', 10))).toMatch(
      /fotos \(JPG, PNG\), videos y PDF/
    );
    expect(problemaConElArchivo(f('a.jpg', 'image/jpeg', 10), 10)).toMatch(
      /Ya hay 10/
    );
    expect(problemaConElArchivo(null)).toMatch(/ningún archivo/);
  });

  it('el selector deja elegir por extension, tambien .webp', () => {
    expect(ACEPTA_ARCHIVOS.split(',')).toEqual(
      expect.arrayContaining(['.webp', '.jpg', '.png', '.mov', '.pdf'])
    );
  });

  it('tamanoLegible', () => {
    expect(tamanoLegible(850 * 1024)).toBe('850 KB');
    expect(tamanoLegible(4.2 * 1024 * 1024)).toBe('4.2 MB');
  });
});

describe('estadoMacroAsesores', () => {
  const macros = [{ id: 12, nombre: 'JR-001 · Dúplex' }];
  const claves = e => e.acciones.map(a => a.clave);

  it('sin macro, invita a guardarla; con cambios sin guardar, avisa que se guardan', () => {
    const e = estadoMacroAsesores(prop(), { macros });
    expect(claves(e)).toEqual(['crear']);
    expect(e.motivo).toBe('');
    expect(
      estadoMacroAsesores(prop(), { macros, sinGuardar: true }).detalle
    ).toMatch(/se guardan antes/);
  });

  it('al dia: solo crear otra; desactualizada: actualizar esta o crear otra', () => {
    const alDia = prop({ macroAsesoresId: 12, macroAsesoresAlDia: true });
    const e = estadoMacroAsesores(alDia, { macros });
    expect(e.titulo).toBe('Macro «JR-001 · Dúplex»');
    expect(claves(e)).toEqual(['nueva']);
    const vieja = prop({ macroAsesoresId: 12, macroAsesoresAlDia: false });
    expect(claves(estadoMacroAsesores(vieja, { macros }))).toEqual([
      'actualizar',
      'nueva',
    ]);
    // Al dia pero con cambios sin guardar: tambien pregunta.
    expect(
      claves(estadoMacroAsesores(alDia, { macros, sinGuardar: true }))
    ).toEqual(['actualizar', 'nueva']);
    expect(estadoMacroAsesores(vieja, { macros: [] }).titulo).toBe(
      'Macro para los asesores'
    );
  });

  it('con archivos subiendo, espera', () => {
    expect(
      estadoMacroAsesores(prop(), { macros, subiendo: true }).motivo
    ).toMatch(/terminen de subir/);
  });
});

describe('los botones de la macro y el resumen para elegirla', () => {
  it('guardar en la misma o en una nueva', () => {
    const vieja = prop({ macroAsesoresId: 12, macroAsesoresAlDia: false });
    expect(
      estadoMacroAsesores(vieja, { macros: [] }).acciones.map(a => a.label)
    ).toEqual([
      'Guardar cambios en la misma macro',
      'Guardar cambios en una nueva macro',
    ]);
  });

  it('una macro en una linea', () => {
    expect(
      resumenCortoDeMacro({
        pasos: [
          { tipo: 'texto' },
          { tipo: 'texto' },
          { tipo: 'archivo', clase: 'video' },
        ],
        ignoradas: ['nota privada', 'asignar agente'],
      })
    ).toBe('2 mensajes · un archivo · además: nota privada, asignar agente');
    expect(resumenCortoDeMacro({ pasos: [], ignoradas: [] })).toBe(
      'no manda mensajes'
    );
  });
});
