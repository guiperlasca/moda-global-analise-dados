/* Gera dados/mapa.json (contornos da América Latina, projeção de Mercator) a partir do Natural Earth.
   Uso: npm install && npm run mapa. O arquivo gerado já acompanha o projeto; só é preciso rodar de novo para mudar o recorte. */
const path = require('path'), fs = require('fs');
const base = path.join(__dirname, '..');
const topo = require('topojson-client');
const world = require('world-atlas/countries-50m.json');
const fc = topo.feature(world, world.objects.countries);
const ALVO = { '076': 'Brasil', '484': 'México', '032': 'Argentina', '170': 'Colômbia', '604': 'Peru', '152': 'Chile' };
const LON0 = -118, LON1 = -33, LAT0 = -56.5, LAT1 = 33;
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const W = 520; const kx = W / (LON1 - LON0) * 180 / Math.PI; // pixels por radiano
const yTop = merc(LAT1), yBot = merc(LAT0); const H = Math.round((yTop - yBot) * kx);
const P = ([lon, lat]) => [ (lon - LON0) * Math.PI / 180 * kx, (yTop - merc(Math.max(-80, lat))) * kx ];
function anel(r) {
  let s = '', ult = null;
  for (const c of r) { const p = P(c).map(v => Math.round(v * 10) / 10); const k = p.join(','); if (k === ult) continue; s += (s ? 'L' : 'M') + k; ult = k; }
  return s + 'Z';
}
function d(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map(pl => pl.map(anel).join('')).join('');
}
function bbox(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let a = [999, 999, -999, -999];
  polys.forEach(pl => pl[0].forEach(([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; }));
  return a;
}
const out = { w: W, h: H, contexto: [], paises: {}, ancoras: {} };
for (const f of fc.features) {
  if (!f.geometry) continue;
  const id = String(f.id).padStart(3, '0');
  const [x0, y0, x1, y1] = bbox(f.geometry);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (ALVO[id]) { out.paises[ALVO[id]] = d(f.geometry); continue; }
  if (cx > LON0 && cx < LON1 && cy > LAT0 && cy < LAT1 - 2 && !(x1 - x0 > 60)) out.contexto.push(d(f.geometry));
}
out.contexto = out.contexto.join('');
const AN = { 'Brasil': [-52, -10], 'México': [-102, 23.5], 'Argentina': [-65, -35], 'Colômbia': [-73.5, 4], 'Peru': [-75, -9.5], 'Chile': [-71.2, -30] };
for (const k in AN) out.ancoras[k] = P(AN[k]).map(v => Math.round(v));
fs.writeFileSync(path.join(base, 'dados', 'mapa.json'), JSON.stringify(out));
console.log('ok', W, H, Object.keys(out.paises), (JSON.stringify(out).length / 1024).toFixed(0) + 'KB');
