/* Moda Global · experiência de apresentação.
   Todos os números vêm de dados/pedidos.json por meio de src/calculos.js. */
(() => {
'use strict';
const DADOS = /*@@PEDIDOS@@*/null;
const MAPA = /*@@MAPA@@*/null;
const C = window.Calc, F = C.fmt;
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const raiz = document.documentElement;
const mqReduz = matchMedia('(prefers-reduced-motion: reduce)');
const mqEstreito = matchMedia('(max-width: 900px), (max-height: 560px)');
const reduzido = () => mqReduz.matches || raiz.classList.contains('reduzir');
const css = n => getComputedStyle(raiz).getPropertyValue(n).trim();
const rem = () => parseFloat(getComputedStyle(raiz).fontSize) || 16;
function el(tag, attrs, pai) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (pai) pai.appendChild(e); return e; }
function txt(pai, x, y, s, attrs = {}) { const t = el('text', Object.assign({ x, y }, attrs), pai); t.textContent = s; return t; }
function passoBonito(x) { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function marcas(max, n = 4) { const p = passoBonito(max / n), t = []; for (let v = 0; v < max + p * .999; v += p) t.push(+v.toFixed(6)); return t; }
function aoRedimensionar(alvo, fn) {
  let ultima = 0, t;
  const ro = new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w === ultima) return; ultima = w; clearTimeout(t); t = setTimeout(fn, 90); });
  ro.observe(alvo);
}
function quandoVisivel(alvo, fn, limiar = .25) {
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: limiar });
  io.observe(alvo);
}
function seletor(id, aoMudar) {
  const g = document.getElementById(id);
  const api = { valor: $('[aria-pressed="true"]', g).dataset.v,
    definir(v, silencioso) { api.valor = String(v); $$('[data-v]', g).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === api.valor))); if (!silencioso) aoMudar(api.valor); } };
  g.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b && g.contains(b)) api.definir(b.dataset.v); });
  return api;
}

/* ===================== Interação: dica e cursor de gráfico ===================== */
const dica = (() => {
  const d = document.createElement('div');
  d.className = 'dica'; d.setAttribute('role', 'tooltip'); d.hidden = true;
  document.body.appendChild(d);
  let dono = null;
  function posiciona(x, y) {
    d.hidden = false; d.style.left = '0px'; d.style.top = '0px';
    const w = d.offsetWidth, h = d.offsetHeight, hdr = document.getElementById('topo').offsetHeight;
    const left = Math.min(innerWidth - w - 10, Math.max(10, x - w / 2));
    let top = y - h - 14;
    if (top < hdr + 8) top = Math.min(innerHeight - h - 10, y + 22);
    d.style.left = left + 'px'; d.style.top = top + 'px';
  }
  return {
    mostrar(html, x, y, quem) { d.innerHTML = html; dono = quem || null; posiciona(x, y); },
    noEl(html, alvo) { const r = alvo.getBoundingClientRect(); d.innerHTML = html; dono = alvo; posiciona(r.left + Math.min(r.width / 2, 160), r.top); },
    esconder(quem) { if (!quem || quem === dono) { d.hidden = true; dono = null; } },
    get dono() { return dono; }
  };
})();
addEventListener('scroll', () => dica.esconder(), { passive: true });
document.addEventListener('pointerdown', e => { const d = dica.dono; if (d && !d.contains(e.target)) dica.esconder(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') dica.esconder(); });
const maiusc = t => t[0].toUpperCase() + t.slice(1);
const semTags = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const lista = pares => `<span class="dl">${pares.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</span>`;

/* Dica em um elemento: mouse (passar), toque (tocar) e teclado (foco). */
function comDica(alvo, html, { clique = true } = {}) {
  if (!alvo.matches('button, a, [tabindex]')) alvo.setAttribute('tabindex', '0');
  alvo.setAttribute('data-interativo', '');
  const abre = () => dica.noEl(html(), alvo);
  // com mouse a dica acompanha o ponteiro; com toque e teclado fica presa ao elemento
  const segue = e => dica.mostrar(html(), e.clientX, e.clientY - 6, alvo);
  alvo.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') segue(e); });
  alvo.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && dica.dono === alvo) segue(e); });
  alvo.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') dica.esconder(alvo); });
  alvo.addEventListener('focus', () => { if (alvo.matches(':focus-visible')) abre(); });
  alvo.addEventListener('blur', () => dica.esconder(alvo));
  if (clique) alvo.addEventListener('click', e => { if (e.pointerType === 'mouse') segue(e); else if (dica.dono !== alvo) abre(); else dica.esconder(); });
  else alvo.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') abre(); });
}

/* Cursor por posição horizontal em gráficos SVG: mouse, toque e setas do teclado. */
function cursor(box, { n, indice, html, ancora, aoMudar, uso = 'Passe o mouse, toque ou use as setas para ler cada mês' }) {
  let i = null;
  box.tabIndex = 0; box.setAttribute('data-interativo', ''); box.setAttribute('role', 'group');
  const sr = document.createElement('p'); sr.className = 'sr-only'; sr.setAttribute('aria-live', 'polite');
  box.insertAdjacentElement('afterend', sr);
  if (uso) { const u = document.createElement('p'); u.className = 'dica-uso'; u.textContent = uso; sr.insertAdjacentElement('afterend', u); }
  function definir(novo, forcar) {
    if (novo === i && !forcar) return;
    i = novo; aoMudar(i);
    if (i == null) { dica.esconder(box); return; }
    const a = ancora(i), h = html(i);
    if (!h) { dica.esconder(box); return; }
    if (a) dica.mostrar(h, a.x, a.y, box);
    sr.textContent = semTags(h);
  }
  box.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const k = indice(e.clientX, e.clientY); definir(k, k != null && dica.dono !== box); } });
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') definir(null); });
  box.addEventListener('click', e => { if (e.pointerType !== 'mouse') { const k = indice(e.clientX, e.clientY); definir(k === i ? null : k); } });
  box.addEventListener('keydown', e => {
    const max = n() - 1; let k;
    if (e.key === 'ArrowRight') k = i == null ? 0 : Math.min(max, i + 1);
    else if (e.key === 'ArrowLeft') k = i == null ? max : Math.max(0, i - 1);
    else if (e.key === 'Home') k = 0;
    else if (e.key === 'End') k = max;
    else if (e.key === 'Escape' && i != null) { e.stopPropagation(); definir(null); return; }
    else return;
    e.preventDefault(); e.stopPropagation(); definir(k);
  });
  box.addEventListener('blur', () => definir(null));
  return { get i() { return i; }, reexibir() { if (i != null) definir(i, true); }, limpar: () => definir(null) };
}

/* ===================== Dados e métricas ===================== */
const base = C.criarBase(DADOS);
const TOT = C.totais(base.pedidos);
const ANO = C.porAno(base.pedidos);
const MERC = C.segmentos(base, 'mercado');
const CAT = C.segmentos(base, 'categoria');
const SERIE = C.serieMensal(base.pedidos);
const FAT = SERIE.map(m => m.centavos / 100), UN = SERIE.map(m => m.unidades);
const MM = { 3: C.mediaMovel(FAT, 3), 6: C.mediaMovel(FAT, 6), 12: C.mediaMovel(FAT, 12) };
const MMU = C.mediaMovel(UN, 12), MMP = C.mediaMovel(SERIE.map(m => m.pedidos), 12);
const mk = nome => MERC.find(s => s.nome === nome);
const PRIORIDADE = { 'Chile': 1, 'Colômbia': 1, 'Argentina': 2 }; // recomendação do relatório
const COR_CAT = ['--c-acess', '--c-fem', '--c-calc', '--c-inf', '--c-masc'];
const pico = (v, ano) => ano * 12 + C.indiceMaximo(v.slice(ano * 12, ano * 12 + 12));

const N = {
  'tot.fatExato': F.cent(TOT.centavos), 'tot.fatMi': F.mi(TOT.centavos), 'tot.pedidos': F.num(TOT.pedidos), 'tot.unidades': F.num(TOT.unidades),
  'ano23.fat': F.cent(ANO[2023].centavos), 'ano24.fat': F.cent(ANO[2024].centavos),
  'cresc.receita': F.pct(C.variacao(ANO[2023].centavos, ANO[2024].centavos)),
  'cresc.pedidos': F.pct(C.variacao(ANO[2023].pedidos, ANO[2024].pedidos)),
  'cresc.unidades': F.pct(C.variacao(ANO[2023].unidades, ANO[2024].unidades)),
  'pico23': F.brl(FAT[pico(FAT, 0)]), 'pico24': F.brl(FAT[pico(FAT, 1)]),
  'junho': F.pct(C.variacao(FAT[5], FAT[17])),
  'corr': F.num(C.correlacao(FAT.slice(0, 12), FAT.slice(12)), 2),
  'm.brasil.pedidos': F.num(mk('Brasil').pedidos) + ' pedidos', 'm.brasil.receita': F.cent(mk('Brasil').centavos),
  'm.chile.ticket': F.cent(mk('Chile').ticketCentavos), 'm.chile.cresc': F.pct(mk('Chile').crescReceita),
  'm.chile.receita24': F.cent(mk('Chile').anos[2024].centavos),
  'm.colombia.cresc': F.pct(mk('Colômbia').crescReceita), 'm.colombia.crescU': F.pct(mk('Colômbia').crescUnidades),
  'm.argentina.cresc': F.pct(mk('Argentina').crescReceita),
  'mape12': F.pct(MM[12].mape, 2, false),
  'prevUn': F.num(Math.round(MMU.total)), 'prevPed': F.num(Math.round(MMP.total)),
  'prevQ1': F.pct(C.variacao(FAT[12] + FAT[13] + FAT[14], MM[12].total), 2, false)
};
$$('[data-n]').forEach(e => { if (N[e.dataset.n] != null) e.textContent = N[e.dataset.n]; });

/* ===================== Revelação editorial ===================== */
(() => {
  const alvos = $$('[data-revela]');
  if (!('IntersectionObserver' in window)) { alvos.forEach(a => a.classList.add('visivel')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  alvos.forEach(a => io.observe(a));
  // segurança: nada permanece invisível se o observador não disparar
  setTimeout(() => alvos.forEach(a => { if (a.getBoundingClientRect().top < innerHeight) a.classList.add('visivel'); }), 1500);
})();

/* ===================== Motor de passos (scrollytelling) ===================== */
function scrolly(id, aoPasso, inicial = 0) {
  const passos = $$('#' + id + ' .passo');
  let atual = -1;
  const ativar = i => { if (i === atual) return; atual = i; passos.forEach((p, k) => p.classList.toggle('ativo', k === i)); aoPasso(i); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) ativar(+e.target.dataset.passo); }), { rootMargin: '-47% 0px -47% 0px' });
    passos.forEach(p => io.observe(p));
  }
  passos.forEach(p => p.addEventListener('click', ev => { if (!ev.target.closest('a,button')) ativar(+p.dataset.passo); }));
  ativar(inicial);
  return { ativar, get atual() { return atual; } };
}

/* ===================== Abertura: métricas e fita de 24 meses ===================== */
(() => {
  const box = $('#fita'), det = $('#ab-det'), legTxt = $('#fita-leg-txt');
  const varA = k => F.pct(C.variacao(ANO[2023][k], ANO[2024][k]));
  const MED = {
    fat: { v: FAT, curto: v => F.mil(v), nome: 'faturamento', leg: 'Cada barra é o faturamento de um mês, a partir de zero',
      det: () => `Valor exato: <b>${F.cent(TOT.centavos)}</b>. 2023: ${F.cent(ANO[2023].centavos)} · 2024: ${F.cent(ANO[2024].centavos)} (${varA('centavos')}).` },
    pedidos: { v: SERIE.map(m => m.pedidos), curto: v => F.num(v) + ' ped.', nome: 'pedidos', leg: 'Cada barra é o número de pedidos de um mês, a partir de zero',
      det: () => `<b>${F.num(TOT.pedidos)} pedidos</b>, um por linha da base. 2023: ${F.num(ANO[2023].pedidos)} · 2024: ${F.num(ANO[2024].pedidos)} (${varA('pedidos')}).` },
    unidades: { v: UN, curto: v => F.num(v) + ' un.', nome: 'unidades', leg: 'Cada barra é o total de unidades de um mês, a partir de zero',
      det: () => `<b>${F.num(TOT.unidades)} unidades</b>, soma da quantidade vendida. 2023: ${F.num(ANO[2023].unidades)} · 2024: ${F.num(ANO[2024].unidades)} (${varA('unidades')}).` }
  };
  const DET_SEG = `<b>Mercados:</b> ${base.mercados.join(', ')}. <b>Categorias:</b> ${base.categorias.join(', ')}.`;
  let med = 'fat', geo = null, foco = null, rects = [];
  function desenha(modo) {
    box.innerHTML = ''; const W = box.clientWidth; if (!W) return;
    const c = MED[med], vals = c.v;
    const H = Math.round(Math.min(130, Math.max(80, W * .09))), fs = Math.max(11, rem() * .66), base0 = H - fs * 1.6;
    const max = Math.max(...vals), gap = 3, bw = (W - gap * 23) / 24, hMax = base0 - fs * 1.4;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' }, box);
    const anima = modo && !reduzido();
    rects = vals.map((v, i) => {
      const h = v / max * hMax, x = i * (bw + gap);
      const r = el('rect', { x, y: base0 - h, width: bw, height: h, fill: i < 12 ? css('--petroleo-claro') : css('--coral'), rx: 1.5 }, svg);
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 100%';
      if (anima) { r.style.transform = 'scaleY(0)'; r.style.transition = modo === 'entrada' ? `transform 520ms cubic-bezier(.22,.8,.24,1) ${240 + i * 28}ms, opacity 160ms` : `transform 380ms cubic-bezier(.22,.8,.24,1) ${i * 10}ms, opacity 160ms`; }
      else r.style.transition = 'opacity 160ms';
      return r;
    });
    [pico(vals, 0), pico(vals, 1)].forEach(i => txt(svg, i * (bw + gap) + bw / 2, base0 - vals[i] / max * hMax - fs * .45, `${C.MESES[i % 12]}/${i < 12 ? 23 : 24} ${c.curto(vals[i])}`, { 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: css('--sobre-escuro') }));
    el('line', { x1: 0, x2: W, y1: base0, y2: base0, stroke: css('--linha-escura') }, svg);
    [[0, 'jan/2023'], [12, 'jan/2024'], [23, 'dez/2024']].forEach(([i, s]) => txt(svg, i * (bw + gap) + (i === 23 ? bw : 0), H - fs * .3, s, { 'font-size': fs, fill: css('--cinza-escuro'), 'text-anchor': i === 23 ? 'end' : 'start' }));
    geo = { bw, gap, base0, max, hMax };
    if (anima) requestAnimationFrame(() => requestAnimationFrame(() => rects.forEach(r => { r.style.transform = 'none'; })));
    aplicaFoco();
  }
  function aplicaFoco() { rects.forEach((r, i) => { r.style.opacity = foco == null || foco === i ? 1 : .4; }); }
  const cur = cursor(box, {
    n: () => 24, uso: null,
    indice: x => { if (!geo) return null; const r = box.getBoundingClientRect(), i = Math.floor((x - r.left) / (geo.bw + geo.gap)); return i >= 0 && i < 24 ? i : null; },
    ancora: i => { const r = box.getBoundingClientRect(), v = MED[med].v[i]; return { x: r.left + i * (geo.bw + geo.gap) + geo.bw / 2, y: r.top + geo.base0 - v / geo.max * geo.hMax }; },
    html: i => { const m = SERIE[i]; return `<b>${maiusc(C.MESES_LONGOS[i % 12])} de ${2023 + Math.floor(i / 12)}</b>${lista([['Faturamento', F.cent(m.centavos)], ['Pedidos', F.num(m.pedidos)], ['Unidades', F.num(m.unidades)], ['Ticket médio', F.cent(m.ticketCentavos)]])}`; },
    aoMudar: i => { foco = i; aplicaFoco(); }
  });
  const nums = $$('.ab-num');
  function escolhe(m) {
    nums.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
    det.innerHTML = m === 'seg' ? DET_SEG : MED[m].det();
    if (m !== 'seg' && m !== med) {
      med = m; legTxt.textContent = MED[m].leg;
      box.setAttribute('aria-label', `${MED[m].nome[0].toUpperCase() + MED[m].nome.slice(1)} mensal de janeiro de 2023 a dezembro de 2024, em 24 barras a partir de zero. Use as setas para percorrer os meses.`);
      desenha('troca'); cur.reexibir();
    }
  }
  nums.forEach(b => b.addEventListener('click', () => escolhe(b.dataset.m)));
  det.innerHTML = MED.fat.det();
  desenha('entrada');
  aoRedimensionar(box, () => desenha(null));
})();

/* ===================== Tempo: linhas mensais com três passos ===================== */
(() => {
  const box = $('#g-tempo'), sint = $('#tempo-sintese'), tit = $('#tempo-tit');
  let met = 'centavos', passo = 0, desenhou = false, foco = null, geo = null;
  const CFG = {
    centavos: { v: FAT, d: [150000, 350000], p: 50000, tk: v => F.mil(v), val: v => F.brl(v), ano: a => F.cent(ANO[a].centavos), varA: C.variacao(ANO[2023].centavos, ANO[2024].centavos), tit: 'Faturamento mensal<small>R$ · 2023 e 2024 · escala a partir de R$ 150 mil</small>', nome: 'Faturamento' },
    unidades: { v: UN, d: [1500, 3000], p: 500, tk: v => F.num(v), val: v => F.num(v) + ' unidades', ano: a => F.num(ANO[a].unidades) + ' unidades', varA: C.variacao(ANO[2023].unidades, ANO[2024].unidades), tit: 'Unidades vendidas por mês<small>2023 e 2024 · escala a partir de 1.500 unidades</small>', nome: 'Unidades' }
  };
  function desenha(animar) {
    const c = CFG[met]; tit.innerHTML = c.tit;
    box.innerHTML = ''; const W = box.clientWidth; if (!W) return;
    const fs = Math.max(13, rem() * .8), H = Math.round(Math.max(280, Math.min(W * .56, innerHeight * .52)));
    const m = { l: fs * 4.4, r: fs * 2.8, t: fs * 1.2, b: fs * 2 }, step = (W - m.l - m.r) / 11;
    const X = i => m.l + i * step, Y = v => H - m.b - (v - c.d[0]) / (c.d[1] - c.d[0]) * (H - m.t - m.b);
    geo = { X, Y, step, ml: m.l };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' }, box);
    const g = el('g', { 'font-size': fs * .88, fill: css('--cinza') }, svg);
    for (let v = c.d[0]; v <= c.d[1]; v += c.p) { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: css('--linha') }, g); txt(g, m.l - fs * .5, Y(v) + fs * .3, c.tk(v), { 'text-anchor': 'end' }); }
    C.MESES.forEach((mm, i) => { if (W > 560 || i % 2 === 0 || i === foco) txt(g, X(i), H - m.b + fs * 1.4, mm, { 'text-anchor': 'middle', 'font-weight': i === foco ? 800 : 400, fill: i === foco ? css('--tinta') : css('--cinza') }); });
    if (foco != null) el('rect', { x: X(foco) - step / 2, y: m.t, width: step, height: H - m.t - m.b, fill: css('--marfim-2') }, svg);
    if (passo === 2) for (let i = 0; i < 12; i++) el('line', { x1: X(i), x2: X(i), y1: Y(c.v[i]), y2: Y(c.v[12 + i]), stroke: css('--cinza'), 'stroke-width': 1.2, 'stroke-dasharray': '2 3', opacity: .7 }, svg);
    if (foco != null) el('line', { x1: X(foco), x2: X(foco), y1: Y(c.v[foco]), y2: Y(c.v[12 + foco]), stroke: css('--tinta'), 'stroke-width': 1.6 }, svg);
    const picos = [pico(c.v, 0), pico(c.v, 1)], fim = [];
    [[0, css('--petroleo'), 2.8], [1, css('--coral'), 3.4]].forEach(([ano, cor, w]) => {
      const pts = C.MESES.map((_, i) => [X(i), Y(c.v[ano * 12 + i])]);
      const p = el('path', { d: 'M' + pts.map(q => q.join(',')).join('L'), fill: 'none', stroke: cor, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      if (animar && !reduzido()) { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.22,.8,.24,1)'; p.style.strokeDashoffset = 0; }
      pts.forEach((q, i) => {
        const ehPico = passo === 1 && picos[ano] === ano * 12 + i, ehFoco = foco === i;
        el('circle', { cx: q[0], cy: q[1], r: ehPico || ehFoco ? 7 : 3.4, fill: ehPico || ehFoco ? css('--marfim') : cor, stroke: cor, 'stroke-width': ehPico || ehFoco ? 3 : 0, opacity: passo === 1 && !ehPico && !ehFoco ? .35 : 1 }, svg);
      });
      fim[ano] = pts[11][1];
    });
    if (Math.abs(fim[0] - fim[1]) < fs * 1.1) { const meio = (fim[0] + fim[1]) / 2, cima = fim[1] <= fim[0] ? 1 : 0; fim[cima] = meio - fs * .6; fim[1 - cima] = meio + fs * .6; }
    [[0, css('--petroleo')], [1, css('--coral-texto')]].forEach(([ano, cor]) => txt(svg, W - m.r + fs * .5, fim[ano] + fs * .35, String(2023 + ano), { 'font-size': fs * .9, 'font-weight': 800, fill: cor }));
    if (passo === 1 && foco == null) picos.forEach((idx, ano) => {
      const i = idx % 12, v = c.v[idx], cor = ano ? css('--coral-texto') : css('--petroleo');
      const anc = i > 7 ? 'end' : 'start', dx = i > 7 ? -fs * .9 : fs * .9;
      txt(svg, X(i) + dx, Y(v) - fs * .7, `Pico ${2023 + ano}: ${C.MESES[i]} · ${c.val(v)}`, { 'text-anchor': anc, 'font-size': fs * .9, 'font-weight': 800, fill: cor, 'paint-order': 'stroke', stroke: css('--marfim'), 'stroke-width': 4, 'stroke-linejoin': 'round' });
    });
    if (passo === 0) txt(svg, m.l + fs * .4, m.t + fs * .6, `2024 vs. 2023: ${F.pct(c.varA)}`, { 'font-size': fs, 'font-weight': 800, fill: css('--tinta') });
    if (passo === 2) txt(svg, m.l + fs * .4, m.t + fs * .6, `Correlação entre os perfis: ${F.num(C.correlacao(c.v.slice(0, 12), c.v.slice(12)), 2)}`, { 'font-size': fs, 'font-weight': 800, fill: css('--tinta') });
    const p0 = picos[0] % 12, p1 = picos[1] % 12;
    sint.textContent = passo === 0 ? `${c.nome}: ${c.ano(2023)} em 2023 e ${c.ano(2024)} em 2024 (${F.pct(c.varA)}).`
      : passo === 1 ? `Pico de 2023: ${C.MESES_LONGOS[p0]}, ${c.val(c.v[picos[0]])}. Pico de 2024: ${C.MESES_LONGOS[p1]}, ${c.val(c.v[picos[1]])}.`
      : `Linhas tracejadas ligam o mesmo mês nos dois anos: as distâncias variam muito, sem padrão repetido.`;
    box.setAttribute('aria-label', `${c.nome} mensal de 2023 e 2024. ${sint.textContent} Use as setas para comparar mês a mês.`);
  }
  const cur = cursor(box, {
    n: () => 12,
    indice: x => { if (!geo) return null; const r = box.getBoundingClientRect(), i = Math.round((x - r.left - geo.ml) / geo.step); return i >= 0 && i < 12 ? i : null; },
    ancora: i => { const r = box.getBoundingClientRect(), c = CFG[met]; return { x: r.left + geo.X(i), y: r.top + geo.Y(Math.max(c.v[i], c.v[12 + i])) }; },
    html: i => { const c = CFG[met], a = c.v[i], b = c.v[12 + i], g = C.variacao(a, b); return `<b>${C.MESES_LONGOS[i][0].toUpperCase() + C.MESES_LONGOS[i].slice(1)}</b>${lista([['2023', c.val(a)], ['2024', c.val(b)], ['Variação', `${F.seta(g)} ${F.pct(g)}`]])}`; },
    aoMudar: i => { foco = i; if (desenhou) desenha(false); }
  });
  seletor('sel-tempo', v => { met = v; desenha(false); cur.reexibir(); });
  scrolly('sc-tempo', i => { passo = i; if (desenhou) desenha(false); });
  quandoVisivel(box, () => { desenhou = true; desenha(true); });
  aoRedimensionar(box, () => { if (desenhou) desenha(false); });
})();

/* ===================== Mercados: ranking que muda com a narrativa ===================== */
(() => {
  const lista_ = $('#rk-lista'), eixo = $('#rk-eixo'), rk = $('#rk'), tit = $('#merc-tit'), chip = $('#merc-chip'), sint = $('#merc-sintese');
  const MET = {
    pedidos: { tit: 'Pedidos', sub: 'Acumulado de 2023–2024 · contagem de IDs', chip: 'Pedidos · 2023–2024', v: s => s.pedidos, f: v => F.num(v), tk: v => F.num(v) },
    receita: { tit: 'Faturamento', sub: 'Acumulado de 2023–2024 · receita registrada, não lucro', chip: 'Faturamento · 2023–2024', v: s => s.centavos / 100, f: v => F.brl(v), tk: v => v ? F.num(v / 1e6, 2) + ' mi' : '0' },
    ticket: { tit: 'Ticket médio', sub: 'Acumulado de 2023–2024 · faturamento ÷ pedidos do país', chip: 'Ticket médio · 2023–2024', v: s => s.ticketCentavos / 100, f: v => F.brl(v), tk: v => F.num(v) },
    cresc: { tit: 'Crescimento da receita', sub: '2024 contra 2023 · mesmo mercado', chip: 'Crescimento · 2024 vs. 2023', v: s => s.crescReceita, f: v => F.pct(v), tk: v => F.num(v) + '%' },
    receita24: { tit: 'Receita de 2024', sub: 'Somente 2024 · não é o acumulado', chip: 'Receita · somente 2024', v: s => s.anos[2024].centavos / 100, f: v => F.brl(v), tk: v => v ? F.num(v / 1000) + ' mil' : '0' }
  };
  const posicao = (s, f) => { const r = C.ranquear(MERC, f).find(x => x.item === s); return r.posicao + 'º' + (r.empate ? ', empate' : ''); };
  const fichaPais = s => {
    const p = PRIORIDADE[s.nome];
    const tag = p === 1 ? '<span class="tag">prioridade para piloto</span>' : p === 2 ? '<span class="tag t2">segunda prioridade</span>' : '';
    return `<b>${s.nome}${tag}</b>${lista([
      ['Pedidos 2023–24', `${F.num(s.pedidos)} · ${posicao(s, x => x.pedidos)}`],
      ['Faturamento 2023–24', F.cent(s.centavos)],
      ['Ticket médio', `${F.cent(s.ticketCentavos)} · ${posicao(s, x => x.ticketCentavos)}`],
      ['Receita de 2024', `${F.cent(s.anos[2024].centavos)} · ${posicao(s, x => x.anos[2024].centavos)}`],
      ['Receita 2024 vs. 2023', `${F.seta(s.crescReceita)} ${F.pct(s.crescReceita)}`],
      ['Unidades 2024 vs. 2023', `${F.seta(s.crescUnidades)} ${F.pct(s.crescUnidades)}`],
      ['Média mensal', F.cent(s.receitaMediaMensalCentavos)]])}<small>Faturamento é receita registrada, não lucro. Média mensal = acumulado ÷ 24.</small>`;
  };
  const DESTAQUE = { 0: ['Brasil'], 1: ['Brasil'], 2: ['Chile'], 3: ['Colômbia', 'Chile', 'Argentina'] };
  const linhas = new Map();
  MERC.forEach(s => {
    const li = document.createElement('li'); li.className = 'rk-linha';
    li.innerHTML = `<span class="rk-nome"><span class="rk-pos"></span>${s.nome}</span><span class="rk-trilho" aria-hidden="true"><span class="rk-barra"></span></span><span class="rk-val"></span>`;
    lista_.appendChild(li); linhas.set(s.nome, li);
    comDica(li, () => fichaPais(s));
  });
  let destaque = DESTAQUE[0];
  function render(chave) {
    const c = MET[chave];
    const r = C.ranquear(MERC, c.v), max = c.v(r[0].item), t = marcas(max, 4), topo = t[t.length - 1];
    tit.innerHTML = `${c.tit}<small>${c.sub}</small>`; chip.textContent = c.chip;
    eixo.innerHTML = t.map((v, i) => `<span style="left:${v / topo * 100}%;${i === t.length - 1 ? 'transform:translateX(-100%)' : ''}">${c.tk(v)}</span>`).join('');
    eixo.setAttribute('aria-hidden', 'true');
    rk.style.setProperty('--grade', (t[1] / topo * 100) + '%');
    r.forEach(({ item, posicao: pos, empate, ordem }) => {
      const li = linhas.get(item.nome);
      li.style.setProperty('--i', ordem);
      $('.rk-pos', li).textContent = pos + 'º' + (empate ? '=' : '');
      $('.rk-barra', li).style.setProperty('--s', Math.max(0, c.v(item)) / topo);
      $('.rk-val', li).textContent = c.f(c.v(item));
      li.setAttribute('aria-label', `${pos}º${empate ? ' (empate)' : ''} ${item.nome}: ${c.f(c.v(item))}. Abrir indicadores do país.`);
      const p = destaque.includes(item.nome) ? (PRIORIDADE[item.nome] === 2 && destaque.length > 1 ? 'p2' : 'p1') : '';
      li.className = 'rk-linha' + (p ? ' ' + p : '') + (destaque.length && !p ? ' apaga' : '');
    });
    const emp = r.filter(x => x.empate);
    sint.textContent = `${r[0].item.nome} lidera: ${c.f(c.v(r[0].item))}. ` + (emp.length ? `${emp.map(x => x.item.nome).join(' e ')} empatam em ${emp[0].posicao}º. ` : '') + `Ordem: ${r.map(x => x.item.nome).join(', ')}.`;
  }
  const PASSOS = ['pedidos', 'receita', 'ticket', 'cresc'];
  const s = seletor('sel-merc', v => { destaque = [C.ranquear(MERC, MET[v].v)[0].item.nome]; render(v); });
  scrolly('sc-mercados', i => { destaque = DESTAQUE[i]; s.definir(PASSOS[i], true); render(PASSOS[i]); });
  // Mapa da conclusão: cada mercado mostra seus indicadores
  const svg = $('#mapa');
  if (MAPA) {
    svg.setAttribute('viewBox', `0 0 ${MAPA.w} ${MAPA.h}`);
    el('path', { d: MAPA.contexto, class: 'mapa-ctx' }, svg);
    MERC.forEach(s2 => {
      const p = el('path', { d: MAPA.paises[s2.nome], class: 'mapa-pais' + (PRIORIDADE[s2.nome] ? ' p' + PRIORIDADE[s2.nome] : ''), tabindex: 0, role: 'button', 'aria-label': `${s2.nome}: ver indicadores` }, svg);
      comDica(p, () => fichaPais(s2));
    });
    const ANC = { 'Brasil': 'middle', 'México': 'middle', 'Argentina': 'start', 'Colômbia': 'end', 'Peru': 'end', 'Chile': 'end' };
    MERC.forEach(s2 => { const [x, y] = MAPA.ancoras[s2.nome]; const dx = ANC[s2.nome] === 'start' ? 14 : ANC[s2.nome] === 'end' ? -14 : 0; const t = txt(svg, x + dx, y + 4, s2.nome, { class: 'mapa-rot', 'text-anchor': ANC[s2.nome], 'pointer-events': 'none', 'aria-hidden': 'true' }); });
  }
  const linhasTab = MERC.map(s2 => `<tr><td>${s2.nome}</td><td>${F.num(s2.pedidos)}</td><td>${F.cent(s2.centavos)}</td><td>${F.cent(s2.ticketCentavos)}</td><td>${F.cent(s2.receitaMediaMensalCentavos)}</td><td>${F.cent(s2.anos[2024].centavos)}</td><td>${F.pct(s2.crescReceita)}</td><td>${F.pct(s2.crescUnidades)}</td><td>${F.pct(s2.crescPedidos)}</td></tr>`).join('');
  $('#tab-merc').innerHTML = `<table><caption class="sr-only">Indicadores por mercado</caption><thead><tr><th scope="col">Mercado</th><th scope="col">Pedidos 23–24</th><th scope="col">Faturamento 23–24</th><th scope="col">Ticket médio</th><th scope="col">Média mensal</th><th scope="col">Receita 2024</th><th scope="col">Receita 24/23</th><th scope="col">Unidades 24/23</th><th scope="col">Pedidos 24/23</th></tr></thead><tbody>${linhasTab}</tbody></table>`;
})();

/* ===================== Categorias ===================== */
(() => {
  const trio = $('#trio');
  const pct = (v, t) => F.pct(v / t * 100, 2, false);
  const fichaCat = s => `<b>${s.nome}</b>${lista([
    ['Pedidos', `${F.num(s.pedidos)} · ${pct(s.pedidos, TOT.pedidos)}`],
    ['Unidades', `${F.num(s.unidades)} · ${pct(s.unidades, TOT.unidades)}`],
    ['Receita', `${F.cent(s.centavos)} · ${pct(s.centavos, TOT.centavos)}`]])}<small>Cada percentual usa o total da própria medida.</small>`;
  const COLS = [
    { t: 'Pedidos', den: `% dos ${F.num(TOT.pedidos)} pedidos`, v: s => s.pedidos, tot: TOT.pedidos, f: v => F.num(v) },
    { t: 'Unidades', den: `% das ${F.num(TOT.unidades)} unidades`, v: s => s.unidades, tot: TOT.unidades, f: v => F.num(v) },
    { t: 'Receita', den: `% de ${F.cent(TOT.centavos)}`, v: s => s.centavos, tot: TOT.centavos, f: v => F.mi(v) }
  ];
  function desenhaTrio(modo) {
    trio.innerHTML = COLS.map(c => {
      const ord = CAT.slice().sort((a, b) => c.v(b) - c.v(a)), max = c.v(ord[0]);
      return `<div class="trio-col"><h3>${c.t}</h3><p class="den">${modo === 'pct' ? c.den : 'Valores absolutos · 2023–2024'}</p>${ord.map(s => `<div class="tb" data-cat="${s.indice}" style="--cor:var(${COR_CAT[s.indice]})" aria-label="${s.nome}: ${c.t.toLowerCase()} ${c.f(c.v(s))}, ${pct(c.v(s), c.tot)}"><span class="tb-nome"><i aria-hidden="true"></i>${s.nome}</span><span class="tb-t" aria-hidden="true"><i style="transform:scaleX(${c.v(s) / max})"></i></span><span class="tb-v">${modo === 'pct' ? pct(c.v(s), c.tot) : c.f(c.v(s))}</span></div>`).join('')}</div>`;
    }).join('') + `<p class="trio-nota">Barras a partir de zero, relativas à maior categoria de cada medida.</p>`;
    $$('.tb', trio).forEach(t => comDica(t, () => fichaCat(CAT[+t.dataset.cat])));
  }
  seletor('sel-trio', desenhaTrio);
  desenhaTrio('pct');
  const io = 'IntersectionObserver' in window;
  const dv = $('#dv'), det = $('#cat-det');
  const DOM = [-20, 40], P = v => (v - DOM[0]) / (DOM[1] - DOM[0]) * 100;
  const ORDEM = CAT.slice().sort((a, b) => b.crescUnidades - a.crescUnidades);
  const barra = v => `<span class="dv-t" style="--z:${P(0)}%"><span class="dv-b" style="left:${v >= 0 ? P(0) : P(v)}%;width:${Math.abs(P(v) - P(0))}%;transform-origin:${v >= 0 ? 'left' : 'right'}"></span><span class="dv-z"></span></span>`;
  const esc = () => `<div>${[-20, 0, 20, 40].map(v => `<span style="left:${P(v)}%">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%</span>`).join('')}</div>`;
  dv.innerHTML = `<div class="dv-cab" aria-hidden="true"><span></span><span>Ano<small>Unidades 2024 vs. 2023</small></span><span>Trimestre recente<small>Unidades T4 vs. T3 de 2024</small></span></div>`
    + ORDEM.map(s => `<button class="dv-linha" type="button" data-cat="${s.indice}" aria-expanded="false" aria-controls="cat-det" style="--cor:var(${COR_CAT[s.indice]})" aria-label="${s.nome}: unidades ${F.pct(s.crescUnidades)} no ano e ${F.pct(s.varT4T3Unidades)} no trimestre recente. Abrir detalhes.">
        <span class="dv-nome"><span class="ponto-cat" aria-hidden="true"></span>${s.nome}</span>
        <span class="dv-cel" data-rot="Ano"><span class="dv-v">${F.seta(s.crescUnidades)} ${F.pct(s.crescUnidades)}</span>${barra(s.crescUnidades)}</span>
        <span class="dv-cel" data-rot="T4/T3"><span class="dv-v">${F.seta(s.varT4T3Unidades)} ${F.pct(s.varT4T3Unidades)}</span>${barra(s.varT4T3Unidades)}</span>
      </button>`).join('')
    + `<div class="dv-esc" aria-hidden="true"><span></span>${esc()}${esc()}</div>`;
  $$('.dv-linha', dv).forEach(b => { const s = CAT[+b.dataset.cat]; comDica(b, () => `<b>${s.nome}</b>${lista([
    ['Unidades 2023 → 2024', `${F.num(s.anos[2023].unidades)} → ${F.num(s.anos[2024].unidades)}`], ['Variação anual', `${F.seta(s.crescUnidades)} ${F.pct(s.crescUnidades)}`],
    ['Unidades T3 → T4 de 2024', `${F.num(s.t3Unidades)} → ${F.num(s.t4Unidades)}`], ['Variação recente', `${F.seta(s.varT4T3Unidades)} ${F.pct(s.varT4T3Unidades)}`]])}<small>Clique para ver todos os números da categoria.</small>`, { clique: false }); });
  const LEITURA = {
    'Acessórios': 'Lidera o acumulado, mas recuou no último trimestre. Acompanhar antes de aumentar compras.',
    'Moda Feminina': 'O sinal de alta mais consistente: cresce no ano e no trimestre recente.',
    'Calçados': 'Cresce no ano e acelera no trimestre recente.',
    'Moda Infantil': 'Estável no ano e em queda no trimestre recente. Acompanhar a retração.',
    'Moda Masculina': 'Cai no ano e se recupera no trimestre recente. Investigar por produto antes de cortes.'
  };
  let aberto = null;
  function abre(i) {
    const s = CAT[i];
    if (aberto === i) { fecha(); return; }
    aberto = i; dica.esconder();
    $$('.dv-linha', dv).forEach(b => b.setAttribute('aria-expanded', String(+b.dataset.cat === i)));
    det.style.setProperty('--cor', `var(${COR_CAT[i]})`);
    det.innerHTML = `<h4><span class="ponto-cat" aria-hidden="true"></span>${s.nome}</h4><button class="fechar" type="button" id="cat-fechar">Fechar</button>
      <dl>
        <div><dt>pedidos 2023–24 · ${pct(s.pedidos, TOT.pedidos)} dos pedidos</dt><dd>${F.num(s.pedidos)}</dd></div>
        <div><dt>unidades · ${pct(s.unidades, TOT.unidades)} das unidades</dt><dd>${F.num(s.unidades)}</dd></div>
        <div><dt>receita · ${pct(s.centavos, TOT.centavos)} da receita</dt><dd>${F.cent(s.centavos)}</dd></div>
        <div><dt>receita 2024 vs. 2023</dt><dd>${F.pct(s.crescReceita)}</dd></div>
        <div><dt>unidades 2023 → 2024</dt><dd>${F.num(s.anos[2023].unidades)} → ${F.num(s.anos[2024].unidades)}</dd></div>
        <div><dt>unidades T3 → T4 de 2024</dt><dd>${F.num(s.t3Unidades)} → ${F.num(s.t4Unidades)}</dd></div>
        <div><dt>estoque médio registrado</dt><dd>${F.num(s.estoqueMedio, 2)} un.</dd></div>
      </dl><p>${LEITURA[s.nome]}</p>`;
    det.hidden = false;
    $('#cat-fechar').addEventListener('click', () => { const b = $(`.dv-linha[data-cat="${i}"]`, dv); fecha(); b.focus(); });
  }
  function fecha() { aberto = null; det.hidden = true; $$('.dv-linha', dv).forEach(b => b.setAttribute('aria-expanded', 'false')); }
  dv.addEventListener('click', e => { const b = e.target.closest('.dv-linha'); if (b) abre(+b.dataset.cat); });
  const escFecha = e => { if (e.key === 'Escape' && aberto !== null) { const i = aberto; fecha(); $(`.dv-linha[data-cat="${i}"]`, dv).focus(); } };
  det.addEventListener('keydown', escFecha); dv.addEventListener('keydown', escFecha);
  const DEST = { 0: ['Moda Feminina', 'Calçados'], 1: ['Acessórios', 'Moda Infantil'], 2: ['Moda Masculina'] };
  scrolly('sc-categorias', i => $$('.dv-linha', dv).forEach(b => b.classList.toggle('apaga', !DEST[i].includes(CAT[+b.dataset.cat].nome))));
  if (!io) { trio.classList.add('visivel'); dv.classList.add('visivel'); }
})();

/* ===================== Limites: faturamento ≠ lucro e estoque ===================== */
(() => {
  const ord = MERC.slice().sort((a, b) => b.centavos - a.centavos), max = ord[0].centavos;
  const lucro = $('#lucro');
  lucro.innerHTML = `<div class="lucro-linha" aria-hidden="true" style="font-weight:800;font-size:.76rem"><span>Mercado</span><span>Faturamento 2023–24, a partir de zero</span><span class="lucro-x">Lucro</span></div>` +
    ord.map(s => `<div class="lucro-linha" data-m="${s.indice}" aria-label="${s.nome}: faturamento ${F.cent(s.centavos)}; lucro sem dados de custo"><b>${s.nome}</b><span class="lucro-t" aria-hidden="true"><i style="width:${s.centavos / max * 100}%"></i></span><span class="lucro-x">sem dados de custo</span></div>`).join('');
  $$('.lucro-linha[data-m]', lucro).forEach(l => { const s = MERC[+l.dataset.m]; comDica(l, () => `<b>${s.nome}</b>${lista([['Faturamento 2023–24', F.cent(s.centavos)], ['Receita de 2024', F.cent(s.anos[2024].centavos)], ['Lucro', 'não calculável']])}<small>Lucro = receita − custos e despesas. A base não traz custos, tributos nem logística.</small>`); });
  const pts = $('#pts');
  pts.innerHTML = CAT.slice().sort((a, b) => b.estoqueMedio - a.estoqueMedio).map(s => `<div class="pt" data-cat="${s.indice}" aria-label="${s.nome}: estoque médio registrado ${F.num(s.estoqueMedio, 2)} unidades"><span>${s.nome}</span><span class="pt-t" aria-hidden="true"><span style="left:${s.estoqueMedio / 3}%">${F.num(s.estoqueMedio, 2)}</span><i style="left:${s.estoqueMedio / 3}%;--cor:var(${COR_CAT[s.indice]})"></i></span></div>`).join('')
    + `<div class="pt-eixo" aria-hidden="true"><span></span><div>${[0, 100, 200, 300].map(v => `<span style="left:${v / 3}%;${v === 0 ? 'transform:none' : v === 300 ? 'transform:translateX(-100%)' : ''}">${v}</span>`).join('')}</div></div>`;
  $$('.pt', pts).forEach(p => { const s = CAT[+p.dataset.cat]; comDica(p, () => `<b>${s.nome}</b>${lista([['Estoque médio registrado', F.num(s.estoqueMedio, 2) + ' un.'], ['Registros na média', F.num(s.pedidos) + ' pedidos']])}<small>Média da coluna Estoque Atual nos pedidos da categoria. Não é saldo disponível.</small>`); });
  const TXT = {
    produto: '<b>Produto:</b> identificar o item (modelo, tamanho, cor). A base registra apenas a categoria do pedido.',
    local: '<b>Local:</b> loja ou depósito onde o estoque está. A base registra apenas o mercado do pedido.',
    data: '<b>Data de posição:</b> quando o saldo foi medido. A base não indica se o valor é anterior ou posterior à venda.',
    saldo: '<b>Saldo disponível:</b> estoque de cada produto, em cada local, em uma data. Com ele seria possível calcular cobertura, giro e ruptura.'
  };
  const esq = $('#esquema'), esqTxt = $('#esquema-txt');
  esq.addEventListener('click', e => {
    const b = e.target.closest('button[data-e]'); if (!b) return;
    const ativo = b.getAttribute('aria-pressed') === 'true';
    $$('button[data-e]', esq).forEach(x => x.setAttribute('aria-pressed', String(!ativo && x === b)));
    esqTxt.innerHTML = ativo ? 'Escolha um elemento do esquema para ver o que falta na base.' : TXT[b.dataset.e];
  });
})();

/* ===================== Previsão: fronteira, janela e escolha do método ===================== */
(() => {
  const box = $('#g-prev'), total = $('#prev-total'), rot = $('#prev-rot'), meses = $('#prev-meses'), erros = $('#erros'), calc = $('#prev-calc');
  let k = 12, passo = mqEstreito.matches ? 3 : 0, valores = MM[12].previsao.slice(), geo = null, anim = 0, seq = [], mesSel = null;
  const MES25 = ['Janeiro', 'Fevereiro', 'Março'];
  const rotIdx = idx => idx < 24 ? `${C.MESES[idx % 12]}/${2023 + Math.floor(idx / 12)}` : `${C.MESES[idx - 24]}/2025 (previsto)`;
  const visiveis = () => passo === 0 ? 0 : passo === 1 ? 1 : 3;
  const calcTxt = h => { const [a, b] = MM[k].janelas[h]; return `<b>${MES25[h]}/2025 · MM${k}</b> = média de ${rotIdx(a)} a ${rotIdx(b)}${b >= 24 ? ', incluindo previsões anteriores' : ''} = <b>${F.brl(MM[k].previsao[h])}</b>.`; };
  erros.innerHTML = [3, 6, 12].map(j => `<div class="erro" data-k="${j}"><span>MM${j}</span><b>${F.pct(MM[j].mape, 2, false)} MAPE</b><span class="t"><i style="width:${MM[j].mape * 10}%"></i></span><span>MAE ${F.brl(MM[j].mae, 0)}</span></div>`).join('');
  $$('.erro', erros).forEach(e => { const j = +e.dataset.k; comDica(e, () => `<b>MM${j} no histórico de 2024</b>${lista([['MAPE', F.pct(MM[j].mape, 2, false)], ['MAE', F.brl(MM[j].mae)], ['Total previsto', F.brl(MM[j].total)]])}<small>Erros de previsões de um mês à frente nos 12 meses de 2024. Não é acurácia garantida para 2025.</small>`); });
  function construir() {
    box.innerHTML = ''; const W = box.clientWidth; if (!W) return;
    const fs = Math.max(13, rem() * .8), H = Math.round(Math.max(250, Math.min(W * .46, innerHeight * .4)));
    const m = { l: fs * 4.4, r: fs * 1.2, t: fs * 2.4, b: fs * 3 };
    const N = 15, d = [200000, 350000], passoX = (W - m.l - m.r) / (N - 1);
    const X = i => m.l + i * passoX, Y = v => H - m.b - (v - d[0]) / (d[1] - d[0]) * (H - m.t - m.b);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' }, box);
    el('rect', { x: X(11), y: m.t - fs * 1.7, width: W - m.r - X(11), height: H - m.b - m.t + fs * 1.7, fill: 'rgb(255 107 66 / .07)' }, svg);
    const janela = el('rect', { class: 'janela', y: m.t, height: H - m.b - m.t, fill: css('--petroleo-claro'), 'fill-opacity': .22, stroke: css('--petroleo-claro'), 'stroke-opacity': .6, opacity: 0 }, svg);
    const guia = el('line', { y1: m.t, y2: H - m.b, stroke: css('--sobre-escuro'), 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0 }, svg);
    const g = el('g', { 'font-size': fs * .88, fill: css('--cinza-escuro') }, svg);
    for (let v = d[0]; v <= d[1]; v += 50000) { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: css('--linha-escura') }, g); txt(g, m.l - fs * .5, Y(v) + fs * .3, F.mil(v), { 'text-anchor': 'end' }); }
    C.MESES.concat(['jan', 'fev', 'mar']).forEach((mm, i) => { if (W > 560 || i % 2 === 0 || i >= 11) txt(g, X(i), H - m.b + fs * 1.35, mm, { 'text-anchor': 'middle', fill: i >= 12 ? css('--coral') : css('--cinza-escuro'), 'font-weight': i >= 12 ? 800 : 400 }); });
    txt(g, X(0), H - m.b + fs * 2.6, '2024', { 'font-weight': 800 }); txt(g, X(12), H - m.b + fs * 2.6, '2025 · previsto', { 'font-weight': 800, fill: css('--coral') });
    el('line', { x1: X(11), x2: X(11), y1: m.t - fs * 1.7, y2: H - m.b, stroke: css('--sobre-escuro'), 'stroke-width': 1.5 }, svg);
    txt(svg, X(11) - fs * .5, m.t - fs * .7, 'dez/2024 · fim dos dados observados', { 'text-anchor': 'end', 'font-size': fs * .85, 'font-weight': 800, fill: css('--sobre-escuro') });
    const obs = FAT.slice(12).map((v, i) => [X(i), Y(v)]);
    el('path', { d: 'M' + obs.map(p => p.join(',')).join('L'), fill: 'none', stroke: css('--sobre-escuro'), 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    const ptsObs = obs.map(p => el('circle', { cx: p[0], cy: p[1], r: 3.4, fill: css('--sobre-escuro') }, svg));
    const linha = el('path', { fill: 'none', stroke: css('--coral'), 'stroke-width': 3.2, 'stroke-dasharray': '8 6', 'stroke-linejoin': 'round' }, svg);
    const pts = [0, 1, 2].map(() => el('circle', { class: 'ponto-prev', r: 6, fill: css('--ameixa'), stroke: css('--coral'), 'stroke-width': 3, opacity: 0 }, svg));
    geo = { X, Y, passoX, janela, guia, linha, pts, ptsObs, ml: m.l };
    pinta(); estado();
  }
  function pinta() {
    if (!geo) return;
    const { X, Y, linha, pts } = geo, vis = visiveis();
    const q = [[X(11), Y(FAT[23])]].concat(valores.map((v, i) => [X(12 + i), Y(v)]));
    linha.setAttribute('d', 'M' + q.slice(0, vis + 1).map(p => p.join(',')).join('L'));
    linha.style.opacity = vis ? 1 : 0;
    pts.forEach((c, i) => { c.setAttribute('cx', q[i + 1][0]); c.setAttribute('cy', q[i + 1][1]); c.style.opacity = i < vis ? 1 : 0; c.setAttribute('r', i === mesSel ? 8 : 6); });
  }
  function janelaEm(h) {
    if (!geo) return;
    const [a, b] = MM[k].janelas[h], ia = a - 12, ib = b - 12, { X, passoX, janela } = geo;
    const x = X(Math.max(ia, 0)) - passoX / 2, w = (ib - Math.max(ia, 0) + 1) * passoX;
    janela.style.x = x + 'px'; janela.style.width = w + 'px'; janela.setAttribute('x', x); janela.setAttribute('width', w);
    janela.style.opacity = 1;
  }
  function estado() {
    seq.forEach(clearTimeout); seq = [];
    if (!geo) return;
    if (mesSel != null) janelaEm(mesSel);
    else if (passo === 1) janelaEm(0);
    else if (passo === 2) { if (reduzido()) janelaEm(2); else { janelaEm(1); seq.push(setTimeout(() => janelaEm(2), 1100)); } }
    else geo.janela.style.opacity = 0;
    pinta();
  }
  function textos() {
    const r = MM[k];
    total.textContent = F.brl(r.total); rot.textContent = `Total previsto · jan–mar/2025 · MM${k}`;
    meses.innerHTML = r.previsao.map((v, i) => `<li><button type="button" data-h="${i}" aria-pressed="${mesSel === i}"><small>${C.MESES[i]}/2025</small><b>${F.brl(v)}</b></button></li>`).join('');
    calc.innerHTML = mesSel == null ? 'Escolha um mês previsto ou passe o mouse no gráfico para ver os meses usados no cálculo.' : calcTxt(mesSel);
    $$('.erro', erros).forEach(e => e.classList.toggle('ativo', +e.dataset.k === k));
    $$('[data-k="k"]').forEach(e => e.textContent = k); $$('[data-k="mm"]').forEach(e => e.textContent = 'MM' + k);
    $$('[data-k="jan"]').forEach(e => e.textContent = F.brl(r.previsao[0])); $$('[data-k="total"]').forEach(e => e.textContent = F.brl(r.total));
    box.setAttribute('aria-label', `Faturamento observado em 2024 e previsto pela MM${k}: janeiro de 2025 ${F.brl(r.previsao[0])}, fevereiro ${F.brl(r.previsao[1])}, março ${F.brl(r.previsao[2])}. Total ${F.brl(r.total)}. MAPE histórico ${F.pct(r.mape, 2, false)}. Use as setas para percorrer os meses.`);
  }
  meses.addEventListener('click', e => {
    const b = e.target.closest('button[data-h]'); if (!b) return;
    const h = +b.dataset.h; mesSel = mesSel === h ? null : h;
    if (mesSel != null && visiveis() < 3) { passo = 3; }
    textos(); estado();
    const nb = $(`button[data-h="${h}"]`, meses); if (nb) nb.focus();
  });
  function interpola(novo) {
    cancelAnimationFrame(anim);
    const ini = valores.slice(), t0 = performance.now(), dur = reduzido() ? 0 : 420;
    const f = now => { const p = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3); valores = ini.map((v, i) => v + (novo[i] - v) * e); pinta(); if (p < 1) anim = requestAnimationFrame(f); };
    anim = requestAnimationFrame(f);
  }
  cursor(box, {
    n: () => 12 + visiveis(),
    indice: x => { if (!geo) return null; const r = box.getBoundingClientRect(), i = Math.round((x - r.left - geo.ml) / geo.passoX); return i >= 0 && i < 12 + visiveis() ? i : null; },
    ancora: i => { const r = box.getBoundingClientRect(); return { x: r.left + geo.X(i), y: r.top + geo.Y(i < 12 ? FAT[12 + i] : valores[i - 12]) }; },
    html: i => {
      if (i < 12) return `<b>${C.MESES_LONGOS[i][0].toUpperCase() + C.MESES_LONGOS[i].slice(1)} de 2024 · observado</b>${lista([['Faturamento', F.brl(FAT[12 + i])]])}`;
      const h = i - 12, [a, b] = MM[k].janelas[h];
      return `<b>${MES25[h]} de 2025 · previsto</b>${lista([['MM' + k, F.brl(MM[k].previsao[h])]])}<small>Média de ${rotIdx(a)} a ${rotIdx(b)}. Não é venda realizada.</small>`;
    },
    aoMudar: i => {
      if (!geo) return;
      geo.guia.style.opacity = i == null ? 0 : 1;
      if (i != null) { geo.guia.setAttribute('x1', geo.X(i)); geo.guia.setAttribute('x2', geo.X(i)); }
      geo.ptsObs.forEach((c, j) => c.setAttribute('r', j === i ? 6 : 3.4));
      if (i != null && i >= 12) { seq.forEach(clearTimeout); seq = []; janelaEm(i - 12); } else estado();
    }
  });
  seletor('sel-mm', v => { k = +v; textos(); interpola(MM[k].previsao); estado(); });
  textos();
  scrolly('sc-previsao', i => { passo = i; estado(); }, passo);
  quandoVisivel(box, construir, .05);
  aoRedimensionar(box, construir);
})();

/* ===================== Explorar os dados ===================== */
(() => {
  const fAno = $('#f-ano'), fMerc = $('#f-merc'), fCat = $('#f-cat'), recorte = $('#recorte');
  base.mercados.forEach((n, i) => fMerc.add(new Option(n, i)));
  base.categorias.forEach((n, i) => fCat.add(new Option(n, i)));
  const kpis = $('#ex-kpis'), gEx = $('#g-ex'), segBox = $('#ex-seg'), segTit = $('#ex-seg-tit'), conteudo = $('#ex-conteudo'), vazio = $('#ex-vazio'), serieTit = $('#ex-serie-tit');
  let porSeg = 'mercado', ultimo = null, geo = null, foco = null;
  const filtro = () => ({ ano: fAno.value ? +fAno.value : null, mercado: fMerc.value === '' ? null : +fMerc.value, categoria: fCat.value === '' ? null : +fCat.value });
  function comparacao(f) {
    if (f.ano === 2023) return { rot: 'Sem comparação disponível: a base começa em 2023', ok: false };
    const a = C.totais(C.filtrar(base.pedidos, { ...f, ano: 2023 })), b = C.totais(C.filtrar(base.pedidos, { ...f, ano: 2024 }));
    return { ok: true, a, b, rot: f.ano === 2024 ? 'vs. 2023 do mesmo recorte' : '2024 vs. 2023 do mesmo recorte' };
  }
  function render() {
    const f = filtro(), lista_ = C.filtrar(base.pedidos, f), t = C.totais(lista_);
    const partes = [fAno.value ? fAno.value : '2023–2024', f.mercado == null ? 'todos os mercados' : base.mercados[f.mercado], f.categoria == null ? 'todas as categorias' : base.categorias[f.categoria]];
    recorte.innerHTML = `Recorte: <b>${partes.join(' · ')}</b> · ${F.num(t.pedidos)} pedidos`;
    if (!t.pedidos) { conteudo.hidden = true; vazio.hidden = false; return; }
    conteudo.hidden = false; vazio.hidden = true;
    const cmp = comparacao(f);
    const varTxt = (ka, kb) => cmp.ok ? `<small class="var">${F.seta(C.variacao(ka, kb))} ${F.pct(C.variacao(ka, kb))}</small><small>${cmp.rot}</small>` : `<small>${cmp.rot}</small>`;
    kpis.innerHTML = [
      ['Faturamento', F.cent(t.centavos), cmp.ok && varTxt(cmp.a.centavos, cmp.b.centavos)],
      ['Pedidos', F.num(t.pedidos), cmp.ok && varTxt(cmp.a.pedidos, cmp.b.pedidos)],
      ['Unidades', F.num(t.unidades), cmp.ok && varTxt(cmp.a.unidades, cmp.b.unidades)],
      ['Ticket médio', F.cent(t.ticketCentavos), cmp.ok && varTxt(cmp.a.ticketCentavos, cmp.b.ticketCentavos)]
    ].map(([r, v, x]) => `<div class="ex-kpi"><span class="r">${r}</span><b>${v}</b>${x || `<small>${cmp.rot}</small>`}</div>`).join('');
    serieTit.innerHTML = `Faturamento mensal do recorte<small style="display:block;font-weight:600;font-size:.8rem;color:var(--cinza)">R$ · escala a partir de zero</small>`;
    ultimo = { lista: lista_, f }; linhas();
    if (porSeg === 'mercado' && f.mercado != null && f.categoria == null) { porSeg = 'categoria'; segSel.definir('categoria', true); }
    else if (porSeg === 'categoria' && f.categoria != null && f.mercado == null) { porSeg = 'mercado'; segSel.definir('mercado', true); }
    const chave = porSeg, nomes = chave === 'mercado' ? base.mercados : base.categorias;
    const grupos = nomes.map((n, i) => ({ n, i, t: C.totais(lista_.filter(p => p[chave] === i)) })).filter(g => g.t.pedidos).sort((a, b) => b.t.centavos - a.t.centavos);
    const fixo = (chave === 'mercado' && f.mercado != null) || (chave === 'categoria' && f.categoria != null);
    segTit.innerHTML = `Participação na receita do recorte<small style="display:block;font-weight:600;font-size:.8rem;color:var(--cinza)">Denominador: ${F.cent(t.centavos)} · barras a partir de zero</small>`;
    const max = grupos[0].t.centavos;
    segBox.innerHTML = grupos.map(g => `<button type="button" class="ex-seg-l" data-i="${g.i}" ${fixo ? 'disabled' : ''} style="--cor:${chave === 'categoria' ? `var(${COR_CAT[g.i]})` : 'var(--petroleo)'}" aria-label="${g.n}: ${F.pct(g.t.centavos / t.centavos * 100, 1, false)} da receita do recorte, ${F.cent(g.t.centavos)}. Filtrar por ${g.n}."><b>${g.n}</b><span class="ex-seg-t" aria-hidden="true"><i style="--s:${g.t.centavos / max}"></i></span><span class="ex-seg-v">${F.pct(g.t.centavos / t.centavos * 100, 1, false)}<small>${F.cent(g.t.centavos)} · ${F.num(g.t.pedidos)} ped.</small></span></button>`).join('')
      + (fixo ? `<p class="nota" style="font-size:.82rem;color:var(--cinza);margin-top:.5rem">${chave === 'mercado' ? 'Este mercado já está fixado' : 'Esta categoria já está fixada'} no filtro. Compare pela outra dimensão.</p>` : `<p class="dica-uso">Clique em uma barra para filtrar por ${chave === 'mercado' ? 'esse mercado' : 'essa categoria'}</p>`);
  }
  segBox.addEventListener('click', e => {
    const b = e.target.closest('button.ex-seg-l'); if (!b || b.disabled) return;
    const sel = porSeg === 'mercado' ? fMerc : fCat;
    sel.value = b.dataset.i; render(); sel.focus();
  });
  function linhas() {
    if (!ultimo) return;
    const { lista: lst, f } = ultimo;
    gEx.innerHTML = ''; const W = gEx.clientWidth; if (!W) return;
    const s = C.serieMensal(lst);
    const series = f.ano == null ? [[0, '2023', css('--petroleo')], [1, '2024', css('--coral')]] : [[f.ano - 2023, String(f.ano), f.ano === 2023 ? css('--petroleo') : css('--coral')]];
    const vals = series.flatMap(([a]) => s.slice(a * 12, a * 12 + 12).map(x => x.centavos / 100));
    const t = marcas(Math.max(...vals, 1), 4), topo = t[t.length - 1];
    const fs = Math.max(12, rem() * .74), H = Math.round(Math.max(220, Math.min(W * .48, 330)));
    const m = { l: fs * 4.4, r: fs * 2.8, t: fs * .8, b: fs * 1.9 }, step = (W - m.l - m.r) / 11;
    const X = i => m.l + i * step, Y = v => H - m.b - v / topo * (H - m.t - m.b);
    geo = { X, Y, step, ml: m.l, s, series };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' }, gEx);
    if (foco != null) el('rect', { x: X(foco) - step / 2, y: m.t, width: step, height: H - m.t - m.b, fill: css('--marfim-2') }, svg);
    const g = el('g', { 'font-size': fs * .9, fill: css('--cinza') }, svg);
    t.forEach(v => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: css('--linha') }, g); txt(g, m.l - fs * .5, Y(v) + fs * .3, v >= 1000 ? F.mil(v) : F.brl(v, 0), { 'text-anchor': 'end' }); });
    C.MESES.forEach((mm, i) => { if (W > 460 || i % 2 === 0 || i === foco) txt(g, X(i), H - m.b + fs * 1.35, mm, { 'text-anchor': 'middle', 'font-weight': i === foco ? 800 : 400 }); });
    series.forEach(([a, nome, cor]) => {
      const pts = C.MESES.map((_, i) => [X(i), Y(s[a * 12 + i].centavos / 100)]);
      el('path', { d: 'M' + pts.map(p => p.join(',')).join('L'), fill: 'none', stroke: cor, 'stroke-width': 2.8, 'stroke-linejoin': 'round' }, svg);
      pts.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: i === foco ? 6 : 3, fill: i === foco ? css('--marfim') : cor, stroke: cor, 'stroke-width': i === foco ? 2.5 : 0 }, svg));
      txt(svg, W - m.r + fs * .5, pts[11][1] + fs * .3, nome, { 'font-size': fs * .9, 'font-weight': 800, fill: cor });
    });
    const tot = series.map(([a, nome]) => `${nome}: ${F.cent(s.slice(a * 12, a * 12 + 12).reduce((x, y) => x + y.centavos, 0))}`).join('; ');
    gEx.setAttribute('aria-label', `Faturamento mensal do recorte. ${tot}. Use as setas para percorrer os meses.`);
  }
  const cur = cursor(gEx, {
    n: () => 12,
    indice: x => { if (!geo) return null; const r = gEx.getBoundingClientRect(), i = Math.round((x - r.left - geo.ml) / geo.step); return i >= 0 && i < 12 ? i : null; },
    ancora: i => { const r = gEx.getBoundingClientRect(), v = Math.max(...geo.series.map(([a]) => geo.s[a * 12 + i].centavos / 100)); return { x: r.left + geo.X(i), y: r.top + geo.Y(v) }; },
    html: i => `<b>${C.MESES_LONGOS[i][0].toUpperCase() + C.MESES_LONGOS[i].slice(1)} · recorte atual</b>${lista(geo.series.flatMap(([a, nome]) => { const mm = geo.s[a * 12 + i]; return [[`${nome} · faturamento`, F.cent(mm.centavos)], [`${nome} · pedidos`, F.num(mm.pedidos)]]; }))}`,
    aoMudar: i => { foco = i; linhas(); }
  });
  [fAno, fMerc, fCat].forEach(x => x.addEventListener('change', () => { render(); cur.reexibir(); }));
  $('#f-limpar').addEventListener('click', () => { fAno.value = ''; fMerc.value = ''; fCat.value = ''; render(); fAno.focus(); });
  $('#filtros').addEventListener('submit', e => e.preventDefault());
  const segSel = seletor('sel-exseg', v => { porSeg = v; render(); });
  render();
  aoRedimensionar(gEx, linhas);
})();

/* ===================== Navegação, cabeçalho e progresso ===================== */
const topo = $('#topo'), nav = $('#nav'), btMenu = $('#bt-menu'), barra = $('#progresso');
const capitulos = $$('main > section[data-cap]');
const linksNav = $$('.nav a');
function abreMenu(v) { nav.dataset.aberto = String(v); btMenu.setAttribute('aria-expanded', String(v)); }
btMenu.addEventListener('click', () => abreMenu(nav.dataset.aberto !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) abreMenu(false); });
let tick = false;
function aoRolar() {
  tick = false;
  const h = topo.offsetHeight, ref = innerHeight * .35;
  let atual = capitulos[0];
  capitulos.forEach(c => { if (c.getBoundingClientRect().top <= ref) atual = c; });
  linksNav.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + atual.id)));
  // cabeçalho escuro quando o capítulo sob ele é escuro
  const sob = [...capitulos, $('#rodape')].find(c => { const r = c.getBoundingClientRect(); return r.top <= h && r.bottom > h; });
  topo.classList.toggle('escuro', !!(sob && (sob.hasAttribute('data-escuro') || sob.id === 'rodape')));
  const total = document.documentElement.scrollHeight - innerHeight;
  barra.style.transform = `scaleX(${total > 0 ? scrollY / total : 0})`;
  if (raiz.classList.contains('apresentar')) atualizaPos();
}
addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(aoRolar); } }, { passive: true });
addEventListener('resize', () => { if (innerWidth > 1180) abreMenu(false); aoRolar(); });

/* ===================== Reduzir animações ===================== */
const btReduzir = $('#bt-reduzir');
function marcaReduzir() { btReduzir.setAttribute('aria-pressed', String(raiz.classList.contains('reduzir'))); }
btReduzir.addEventListener('click', () => {
  raiz.classList.toggle('reduzir');
  try { localStorage.setItem('mg-reduzir', raiz.classList.contains('reduzir') ? '1' : '0'); } catch (e) {}
  marcaReduzir();
  if (raiz.classList.contains('reduzir')) $$('[data-revela]').forEach(a => a.classList.add('visivel'));
});
marcaReduzir();

/* ===================== Modo Apresentar ===================== */
const ctrl = $('#ctrl'), btAp = $('#bt-apresentar'), pos = $('#p-pos'), ajuda = $('#ajuda'), btAjuda = $('#p-ajuda');
const pontos = () => $$('[data-ponto]').filter(p => p.offsetParent !== null);
function indiceAtual() {
  const ref = topo.offsetHeight + innerHeight * .3, ps = pontos();
  let i = 0; ps.forEach((p, k) => { if (p.getBoundingClientRect().top <= ref) i = k; });
  return { i, ps };
}
function atualizaPos() { const { i, ps } = indiceAtual(); pos.textContent = `Ponto ${i + 1} de ${ps.length}`; }
function irPonto(delta) {
  // distância até a posição em que scrollIntoView deixaria o ponto (respeita o scroll-padding do cabeçalho)
  const sp = parseFloat(getComputedStyle(raiz).scrollPaddingTop) || topo.offsetHeight;
  const dist = p => { const r = p.getBoundingClientRect(); return p.classList.contains('passo') ? r.top + r.height / 2 - (sp + innerHeight) / 2 : r.top - sp; };
  const ps = pontos(), fim = scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
  const alvo = delta > 0 ? (fim ? null : ps.find(p => dist(p) > 12)) : ps.slice().reverse().find(p => dist(p) < -12);
  if (!alvo) return;
  alvo.scrollIntoView({ behavior: reduzido() ? 'auto' : 'smooth', block: alvo.classList.contains('passo') ? 'center' : 'start' });
}
function apresentar(v) {
  raiz.classList.toggle('apresentar', v); ctrl.hidden = !v; btAp.setAttribute('aria-pressed', String(v));
  btAp.textContent = v ? 'Sair do modo' : 'Apresentar';
  if (!v) { ajuda.hidden = true; btAjuda.setAttribute('aria-expanded', 'false'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  else atualizaPos();
}
btAp.addEventListener('click', () => apresentar(!raiz.classList.contains('apresentar')));
$('#p-ant').addEventListener('click', () => irPonto(-1));
$('#p-prox').addEventListener('click', () => irPonto(1));
$('#p-sair').addEventListener('click', () => apresentar(false));
btAjuda.addEventListener('click', () => { ajuda.hidden = !ajuda.hidden; btAjuda.setAttribute('aria-expanded', String(!ajuda.hidden)); });
$('#p-tela').addEventListener('click', () => {
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  const r = raiz.requestFullscreen && raiz.requestFullscreen();
  const falha = () => { ajuda.textContent = 'Tela cheia indisponível neste navegador. Use F11 ou siga sem ela.'; ajuda.hidden = false; };
  if (!r) falha(); else r.catch(falha);
});
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  const emCampo = t.closest && t.closest('input, select, textarea, [contenteditable="true"], [contenteditable=""], dialog, [role="dialog"]');
  if (e.key === 'Escape') {
    if (nav.dataset.aberto === 'true') { abreMenu(false); btMenu.focus(); return; }
    if (raiz.classList.contains('apresentar') && !document.fullscreenElement && !emCampo) apresentar(false);
    return;
  }
  if (!raiz.classList.contains('apresentar') || emCampo) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); irPonto(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); irPonto(-1); }
});

aoRolar();
})();
