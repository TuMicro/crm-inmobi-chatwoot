import {
  avisoDelVideo,
  cuerpoDe,
  datosALista,
  filtrar,
  formularioDe,
  hayCambios,
  listaADatos,
  ordenar,
  origen,
  pendientes,
  precioTexto,
  resumen,
  subtitulo,
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
  ficha: 'FICHA GENERADA',
  fichaPorDefecto: true,
  videoUrl: null,
  mapsUrl: 'https://maps.google.com/?q=1,2',
  horarioVisitas: null,
  negociable: null,
  condiciones: null,
  notas: null,
  datos: {},
  ...extra,
});

describe('precioTexto y subtitulo', () => {
  it('pone el simbolo de la moneda y separa los miles', () => {
    expect(precioTexto(prop())).toBe('$ 298,000');
    expect(
      precioTexto(prop({ moneda: 'PEN', precio: 1500, periodo: 'mensual' }))
    ).toBe('S/ 1,500 mensual');
    expect(precioTexto(prop({ precio: null }))).toBe('Sin precio');
  });

  it('dice de donde sale: web, codigo y direccion', () => {
    expect(origen(prop())).toBe('madhouse · codigo MH-7 · Av. Camino Real 123');
    expect(origen({ site: 'madhouse' })).toBe('madhouse');
  });

  it('resume tipo, distrito, dormitorios y metros', () => {
    expect(subtitulo(prop())).toBe(
      'Departamento en San Isidro · 3 dorm · 168 m²'
    );
  });
});

describe('pendientes', () => {
  it('dice que le falta para que la IA la mande completa', () => {
    expect(pendientes(prop())).toEqual([
      'ficha generada',
      'sin video',
      'sin horario de visitas',
    ]);
    expect(
      pendientes(
        prop({
          fichaPorDefecto: false,
          videoUrl: 'https://x/v.mp4',
          horarioVisitas: '11 a 13',
        })
      )
    ).toEqual([]);
  });
});

describe('filtrar y ordenar', () => {
  const lista = [
    prop({ id: 'a', distrito: 'Barranco', titulo: 'Dúplex frente al mar' }),
    prop({
      id: 'b',
      site: 'joserojas',
      distrito: 'San Isidro',
      disponibilidad: 'vendido',
    }),
    prop({ id: 'c', distrito: 'Miraflores', fichaPorDefecto: false }),
  ];

  it('por web y por estado', () => {
    expect(filtrar(lista, { site: 'joserojas' }).map(p => p.id)).toEqual(['b']);
    expect(filtrar(lista, { estado: 'vendido' }).map(p => p.id)).toEqual(['b']);
  });

  it('por texto, sin tildes y con varias palabras', () => {
    expect(filtrar(lista, { texto: 'duplex mar' }).map(p => p.id)).toEqual([
      'a',
    ]);
    expect(filtrar(lista, { texto: 'MIRAFLORES' }).map(p => p.id)).toEqual([
      'c',
    ]);
    expect(filtrar(lista, { texto: 'mh-7' }).length).toBe(3);
    expect(filtrar(lista, { texto: 'surco' })).toEqual([]);
  });

  it('primero las que tienen la ficha generada, al final las vendidas', () => {
    expect(ordenar(lista).map(p => p.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('resumen', () => {
  it('cuenta por estado, fichas propias y videos', () => {
    const r = resumen([
      prop(),
      prop({ disponibilidad: 'vendido' }),
      prop({ fichaPorDefecto: false, videoUrl: 'https://x/v.mp4' }),
    ]);
    expect(r).toEqual({
      total: 3,
      disponibles: 2,
      reservadas: 0,
      vendidas: 1,
      conFichaPropia: 1,
      conVideo: 1,
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
  it('con la ficha generada, el campo va vacio', () => {
    expect(formularioDe(prop()).ficha).toBe('');
    expect(
      formularioDe(prop({ fichaPorDefecto: false, ficha: 'La mía' })).ficha
    ).toBe('La mía');
  });

  it('sabe si hay algo sin guardar', () => {
    const p = prop();
    const form = formularioDe(p);
    expect(hayCambios(form, p)).toBe(false);
    expect(hayCambios({ ...form, visitHours: '11 a 13' }, p)).toBe(true);
    expect(hayCambios({ ...form, ficha: '  ' }, p)).toBe(false);
    expect(
      hayCambios({ ...form, datos: [{ clave: 'piso', valor: '7' }] }, p)
    ).toBe(true);
  });

  it('el cuerpo del PUT lleva la propiedad, todos los campos y quien lo hizo', () => {
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
      mapsUrl: 'https://maps.google.com/?q=1,2',
      visitHours: '11 a 13',
      availability: 'disponible',
      negotiable: '',
      conditions: '',
      notes: '',
      facts: { piso: '7' },
      updatedBy: 'Kefrin',
    });
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
