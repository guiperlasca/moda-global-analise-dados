// Executar na raiz do projeto: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Calc = require('../src/calculos.js');
const base = Calc.criarBase(require(path.join(__dirname, '..', 'dados', 'pedidos.json')));

const reais = c => Math.round(c) / 100;
const pct2 = v => Math.round(v * 100) / 100;
const seg = (chave, nome) => Calc.segmentos(base, chave).find(s => s.nome === nome);

test('panorama 2023–2024', () => {
  const t = Calc.totais(base.pedidos);
  assert.equal(t.pedidos, 2250);
  assert.equal(t.unidades, 56782);
  assert.equal(reais(t.centavos), 6230296.22);
  assert.equal(reais(t.ticketCentavos), 2769.02);
  const a = Calc.porAno(base.pedidos);
  assert.equal(reais(a[2023].centavos), 2965593.47);
  assert.equal(reais(a[2024].centavos), 3264702.75);
  assert.equal(pct2(Calc.variacao(a[2023].centavos, a[2024].centavos)), 10.09);
  assert.equal(pct2(Calc.variacao(a[2023].pedidos, a[2024].pedidos)), 5.67);
  assert.equal(pct2(Calc.variacao(a[2023].unidades, a[2024].unidades)), 7.53);
});

test('mercados: acumulado, 2024 e crescimento', () => {
  const ref = {
    'Brasil': [395, 1105260.26, 2798.13, 46052.51, 558878.02, 2.29, -4.42],
    'México': [384, 1056273.43, 2750.71, 44011.39, 538793.78, 4.12, 16.44],
    'Argentina': [373, 974527.93, 2612.68, 40605.33, 529742.48, 19.10, 11.33],
    'Colômbia': [370, 990727.43, 2677.64, 41280.31, 543187.45, 21.37, 19.05],
    'Peru': [370, 1023537.88, 2766.32, 42647.41, 517213.40, 2.15, -4.61],
    'Chile': [358, 1079969.29, 3016.67, 44998.72, 576887.62, 14.67, 10.33]
  };
  for (const [nome, [ped, rec, tic, mensal, rec24, cR, cU]] of Object.entries(ref)) {
    const s = seg('mercado', nome);
    assert.equal(s.pedidos, ped, nome);
    assert.equal(reais(s.centavos), rec, nome);
    assert.equal(reais(s.ticketCentavos), tic, nome);
    assert.equal(reais(s.receitaMediaMensalCentavos), mensal, nome);
    assert.equal(reais(s.anos[2024].centavos), rec24, nome);
    assert.equal(pct2(s.crescReceita), cR, nome);
    assert.equal(pct2(s.crescUnidades), cU, nome);
  }
  assert.equal(pct2(seg('mercado', 'Colômbia').crescPedidos), 12.64);
});

test('ranking trata empates (Colômbia e Peru com 370 pedidos)', () => {
  const r = Calc.ranquear(Calc.segmentos(base, 'mercado'), s => s.pedidos);
  assert.deepEqual(r.map(x => [x.item.nome, x.posicao, x.empate]), [
    ['Brasil', 1, false], ['México', 2, false], ['Argentina', 3, false],
    ['Colômbia', 4, true], ['Peru', 4, true], ['Chile', 6, false]]);
});

test('categorias: acumulado, ano, trimestre e estoque', () => {
  const ref = {
    'Acessórios': [469, 12239, 1389210.51, 11.78, -18.86, 276.97],
    'Moda Feminina': [460, 11549, 1262238.33, 21.67, 27.75, 275.04],
    'Calçados': [456, 11252, 1227524.59, 12.99, 32.28, 277.43],
    'Moda Infantil': [442, 10822, 1210814.31, 0.56, -11.24, 276.20],
    'Moda Masculina': [423, 10920, 1140508.48, -8.19, 39.57, 272.03]
  };
  for (const [nome, [ped, un, rec, ano, tri, est]] of Object.entries(ref)) {
    const s = seg('categoria', nome);
    assert.equal(s.pedidos, ped, nome);
    assert.equal(s.unidades, un, nome);
    assert.equal(reais(s.centavos), rec, nome);
    assert.equal(pct2(s.crescUnidades), ano, nome);
    assert.equal(pct2(s.varT4T3Unidades), tri, nome);
    assert.equal(pct2(s.estoqueMedio), est, nome);
  }
  const est = base.pedidos.reduce((a, p) => a + p.estoque, 0) / base.pedidos.length;
  assert.equal(pct2(est), 275.59);
});

test('série mensal, picos e correlação dos perfis', () => {
  const s = Calc.serieMensal(base.pedidos).map(m => m.centavos / 100);
  assert.equal(s[6], 304828.81);   // jul/2023
  assert.equal(s[17], 329170.99);  // jun/2024
  assert.equal(Calc.indiceMaximo(s.slice(0, 12)), 6);
  assert.equal(Calc.indiceMaximo(s.slice(12)), 5);
  assert.equal(Math.round(Calc.correlacao(s.slice(0, 12), s.slice(12)) * 100) / 100, -0.15);
});

test('médias móveis: erros e projeções jan–mar/2025', () => {
  const s = Calc.serieMensal(base.pedidos).map(m => m.centavos / 100);
  const ref = {
    3: [25895.17, 9.16, 833373.10, [274717.55, 283705.61, 274949.95]],
    6: [23539.72, 8.42, 812718.91, [269380.98, 270808.24, 272529.68]],
    12: [20683.43, 7.16, 821646.52, [272058.56, 275334.44, 274253.51]]
  };
  for (const [k, [mae, mape, total, meses]] of Object.entries(ref)) {
    const r = Calc.mediaMovel(s, +k);
    assert.equal(Math.round(r.mae * 100) / 100, mae, 'MAE MM' + k);
    assert.equal(pct2(r.mape), mape, 'MAPE MM' + k);
    assert.equal(Math.round(r.total * 100) / 100, total, 'total MM' + k);
    assert.deepEqual(r.previsao.map(v => Math.round(v * 100) / 100), meses, 'meses MM' + k);
  }
  const mm12 = Calc.mediaMovel(s, 12);
  assert.deepEqual(mm12.janelas, [[12, 23], [13, 24], [14, 25]]);
  const un = Calc.mediaMovel(Calc.serieMensal(base.pedidos).map(m => m.unidades), 12);
  assert.equal(Math.round(un.total), 7418);
  const q1 = s[12] + s[13] + s[14];
  assert.equal(pct2(Calc.variacao(q1, mm12.total)), 5.71);
});

test('filtros do explorador', () => {
  const chile24 = Calc.totais(Calc.filtrar(base.pedidos, { ano: 2024, mercado: base.mercados.indexOf('Chile') }));
  assert.equal(reais(chile24.centavos), 576887.62);
  assert.equal(chile24.ticketCentavos, chile24.centavos / chile24.pedidos);
  const vazio = Calc.totais([]);
  assert.equal(vazio.pedidos, 0);
  assert.equal(vazio.ticketCentavos, null);
  assert.equal(Calc.variacao(0, 10), null);
  assert.equal(Calc.fmt.pct(null), 'Sem comparação disponível');
  // ticket total ≠ média simples dos tickets dos países
  const media = Calc.segmentos(base, 'mercado').reduce((a, s) => a + s.ticketCentavos, 0) / 6;
  assert.notEqual(reais(media), 2769.02);
});

test('formatação pt-BR', () => {
  assert.equal(Calc.fmt.cent(623029622), 'R$ 6.230.296,22');
  assert.equal(Calc.fmt.mi(623029622), 'R$ 6,23 mi');
  assert.equal(Calc.fmt.pct(-8.19), '−8,19%');
  assert.equal(Calc.fmt.pct(10.0859), '+10,09%');
});
