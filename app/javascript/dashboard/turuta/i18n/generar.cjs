/* eslint-disable */
// [turuta] Genera es.json: la capa de textos que se superpone a los es/*.json
// de Chatwoot SIN tocarlos (un rebase no la pisa).
//
//   node app/javascript/dashboard/turuta/i18n/generar.cjs
//
// Dos fuentes, la segunda gana:
//   1. Regla automatica: "conversacion" -> "chat", con el genero arreglado
//      (la conversacion abierta -> el chat abierto).
//   2. manual.json: textos escritos a mano, por ruta (traducciones que faltan
//      en Chatwoot, "Carpetas" -> "Filtros", arreglos de la regla 1...).
//
// Tras subir de version de Chatwoot: volver a ejecutarlo y revisar el diff.
const fs = require('fs');
const path = require('path');

const ES = path.join(__dirname, '../../i18n/locale/es');

const ANTES = {
  la: 'el', las: 'los', una: 'un', unas: 'unos', esta: 'este', estas: 'estos',
  esa: 'ese', esas: 'esos', nueva: 'nuevo', nuevas: 'nuevos', otra: 'otro',
  otras: 'otros', toda: 'todo', todas: 'todos', muchas: 'muchos',
  ninguna: 'ningún', primera: 'primer', última: 'último', últimas: 'últimos',
  ultima: 'último', próxima: 'próximo', misma: 'mismo', varias: 'varios',
  cuántas: 'cuántos', aquellas: 'aquellos', dicha: 'dicho', ambas: 'ambos',
  cualquier: 'cualquier', cada: 'cada',
};
const ADJ = [
  'abierta', 'resuelta', 'asignada', 'seleccionada', 'pospuesta', 'nueva',
  'activa', 'silenciada', 'creada', 'actualizada', 'cerrada', 'eliminada',
  'atendida', 'desatendida', 'mencionada', 'marcada', 'reabierta', 'misma',
  'iniciada', 'archivada', 'filtrada', 'bloqueada', 'completada', 'programada',
  'recibida', 'respondida', 'transferida', 'única', 'gestionada', 'manejada',
  'vinculada', 'relacionada', 'encontrada', 'guardada', 'pendientes', 'previa',
  'continua', 'compartida', 'asociada', 'entrantes', 'inactiva', 'antigua',
  'reciente', 'fijada', 'destacada', 'priorizada', 'exportada', 'enviada',
  'cargada', 'utilizada', 'transmitida', 'manipulada', 'escalada',
  'sincronizada', 'pasada', 'cambiada',
];
const DESPUES = {};
ADJ.forEach(a => {
  if (!a.endsWith('a')) return;
  const m = a.slice(0, -1) + 'o';
  DESPUES[a] = m;
  DESPUES[a + 's'] = m + 's';
});
// Palabras que NO cortan la concordancia (verbos copulativos y negacion).
const PUENTE = new Set([
  'no', 'fue', 'fueron', 'es', 'son', 'está', 'están', 'será', 'serán', 'ha',
  'han', 'sido', 'sea', 'sean', 'queda', 'quedará', 'ya', 'más', 'muy', 'se',
  'sin', 'actualmente', 'aún', 'haya', 'hayan', 'estará', 'estarán',
  'siendo', 'te', 'entrantes', 'visibles', 'manejados', 'que',
]);

const ARREGLOS = [
  ['¿Quieres asignarla a ti mismo?', '¿Quieres asignártelo?'],
  ['algo en ellas', 'algo en ellos'],
  ['las {n} chats', 'los {n} chats'],
  ['y de las no atendidas', 'y de los no atendidos'],
  ['y de las asignadas a otros', 'y de los asignados a otros'],
  ['pero no sobre las no asignadas', 'pero no sobre los no asignados'],
  ['te han sido asignadas', 'te han sido asignados'],
  ['sólo están seleccionadas', 'sólo están seleccionados'],
  ['serán sincronizadas', 'serán sincronizados'],
];

const mayus = (orig, nuevo) =>
  orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase()
    ? nuevo[0].toUpperCase() + nuevo.slice(1)
    : nuevo;

const LETRA = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const RE = new RegExp(
  '((?:[' + LETRA + ']+ +){0,2})(conversaci(?:ó|o)n(?:es)?)((?: +[' + LETRA + ']+){0,4})',
  'gi'
);

function aChat(texto) {
  if (!/conversaci/i.test(texto)) return texto;
  let out = texto.replace(RE, (todo, antes, nombre, despues) => {
    const plural = /es$/i.test(nombre);
    const pre = antes
      .split(/(\s+)/)
      .map(w => (ANTES[w.toLowerCase()] ? mayus(w, ANTES[w.toLowerCase()]) : w))
      .join('');
    const nuevoNombre = mayus(nombre, plural ? 'chats' : 'chat');
    const trozos = despues.split(/(\s+)/);
    let sigue = true;
    const post = trozos
      .map(w => {
        if (!sigue || !w.trim()) return w;
        const k = w.toLowerCase();
        if (DESPUES[k]) return mayus(w, DESPUES[k]);
        if (!PUENTE.has(k)) sigue = false;
        return w;
      })
      .join('');
    return pre + nuevoNombre + post;
  });
  // Restos de genero que la regla de vecinos no alcanza.
  ARREGLOS.forEach(([a, b]) => {
    out = out.split(a).join(b);
  });
  // Contracciones que aparecen al cambiar "la" por "el".
  out = out
    .replace(/\bde el chat\b/g, 'del chat')
    .replace(/\bDe el chat\b/g, 'Del chat')
    .replace(/\ba el chat\b/g, 'al chat')
    .replace(/\bA el chat\b/g, 'Al chat');
  return out;
}

function recorrer(obj, fn, ruta) {
  Object.keys(obj).forEach(k => {
    const p = ruta ? ruta + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') recorrer(obj[k], fn, p);
    else if (typeof obj[k] === 'string') fn(p, obj[k]);
  });
}
function poner(obj, ruta, valor) {
  const partes = ruta.split('.');
  let o = obj;
  partes.slice(0, -1).forEach(k => {
    if (!o[k] || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  });
  o[partes[partes.length - 1]] = valor;
}

const base = {};
fs.readdirSync(ES)
  .filter(f => f.endsWith('.json'))
  .sort()
  .forEach(f => Object.assign(base, JSON.parse(fs.readFileSync(path.join(ES, f), 'utf8'))));

const planos = {};
recorrer(base, (ruta, valor) => {
  const nuevo = aChat(valor);
  if (nuevo !== valor) planos[ruta] = nuevo;
});
const automaticos = Object.keys(planos).length;

const manual = JSON.parse(fs.readFileSync(path.join(__dirname, 'manual.json'), 'utf8'));
// Se valida contra el INGLES: es la referencia de Chatwoot. Hay rutas que en
// espanol ni existen (por eso salen en ingles) y justo esas queremos cubrir.
const EN = path.join(__dirname, '../../i18n/locale/en');
const ingles = {};
fs.readdirSync(EN)
  .filter(f => f.endsWith('.json'))
  .forEach(f => Object.assign(ingles, JSON.parse(fs.readFileSync(path.join(EN, f), 'utf8'))));
const existentes = {};
recorrer(ingles, (ruta, valor) => { existentes[ruta] = valor; });
const huerfanas = Object.keys(manual).filter(r => !(r in existentes));
if (huerfanas.length) {
  // Una ruta que ya no existe en Chatwoot = texto nuestro que no se ve.
  console.error('manual.json tiene rutas que Chatwoot no tiene:\n  ' + huerfanas.join('\n  '));
  process.exit(1);
}
Object.assign(planos, manual);

const salida = {};
Object.keys(planos).sort().forEach(r => poner(salida, r, planos[r]));
fs.writeFileSync(path.join(__dirname, 'es.json'), JSON.stringify(salida, null, 2) + '\n');
console.log('automaticos:', automaticos, '| manuales:', Object.keys(manual).length, '| total:', Object.keys(planos).length);

if (process.argv.includes('--muestra')) {
  recorrer(base, (ruta, valor) => {
    if (planos[ruta] && !manual[ruta]) console.log(valor + '\n  => ' + planos[ruta]);
  });
}
