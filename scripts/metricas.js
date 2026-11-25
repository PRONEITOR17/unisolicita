'use strict';
/** Métricas del código para el informe final: archivos, líneas y clases por capa. */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CARPETAS = ['src', 'public/js', 'public/css', 'db', 'tests', 'scripts'];
const EXT = new Set(['.js', '.ejs', '.css', '.sql']);

function archivos(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? archivos(ruta) : EXT.has(path.extname(e.name)) ? [ruta] : [];
  });
}

function contar(ruta) {
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n');
  const codigo = lineas.filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*|--)/.test(l)).length;
  return { total: lineas.length, codigo };
}

const porGrupo = {};
let clases = 0;
for (const carpeta of CARPETAS) {
  for (const ruta of archivos(path.join(RAIZ, carpeta))) {
    const rel = path.relative(RAIZ, ruta);
    const grupo = rel.split(path.sep).slice(0, rel.startsWith('src') ? 2 : 1).join('/');
    const { total, codigo } = contar(ruta);
    const g = (porGrupo[grupo] ||= { archivos: 0, lineas: 0, codigo: 0 });
    g.archivos += 1;
    g.lineas += total;
    g.codigo += codigo;
    if (ruta.endsWith('.js') && rel.startsWith('src')) {
      clases += (fs.readFileSync(ruta, 'utf8').match(/^class\s+\w+/gm) || []).length;
    }
  }
}

const filas = Object.entries(porGrupo).sort(([a], [b]) => a.localeCompare(b));
const sum = (k) => filas.reduce((a, [, g]) => a + g[k], 0);
console.log('Grupo'.padEnd(24), 'Archivos'.padStart(9), 'Líneas'.padStart(8), 'Código'.padStart(8));
console.log('-'.repeat(52));
for (const [grupo, g] of filas) {
  console.log(grupo.padEnd(24), String(g.archivos).padStart(9), String(g.lineas).padStart(8), String(g.codigo).padStart(8));
}
console.log('-'.repeat(52));
console.log('TOTAL'.padEnd(24), String(sum('archivos')).padStart(9), String(sum('lineas')).padStart(8), String(sum('codigo')).padStart(8));
console.log(`\nClases definidas en src/: ${clases}`);
