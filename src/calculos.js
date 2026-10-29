/* Cálculos do site Moda Global.
   Funções puras sobre os pedidos de dados/pedidos.json. Usado no navegador (window.Calc)
   e nos testes (require). Valores monetários em centavos até a exibição. */
(function (raiz) {
  'use strict';

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /* ---------- Base ---------- */
  function criarBase(json) {
    const pedidos = json.pedidos.map(([mes, mercado, categoria, unidades, centavos, estoque]) => ({
      mes, ano: 2023 + Math.floor(mes / 12), mesDoAno: mes % 12, trimestre: Math.floor((mes % 12) / 3) + 1,
      mercado, categoria, unidades, centavos, estoque
    }));
    return { mercados: json.mercados, categorias: json.categorias, pedidos };
  }

  /* filtro: { ano: 2023 | 2024 | null, mercado: índice | null, categoria: índice | null } */
  function filtrar(pedidos, filtro = {}) {
    return pedidos.filter(p =>
      (filtro.ano == null || p.ano === filtro.ano) &&
      (filtro.mercado == null || p.mercado === filtro.mercado) &&
      (filtro.categoria == null || p.categoria === filtro.categoria));
  }

  function totais(pedidos) {
    let unidades = 0, centavos = 0;
    for (const p of pedidos) { unidades += p.unidades; centavos += p.centavos; }
    const n = pedidos.length;
    // Ticket = receita total ÷ pedidos do mesmo recorte; nulo quando não há pedidos.
    return { pedidos: n, unidades, centavos, ticketCentavos: n ? centavos / n : null };
  }

  /* Variação relativa em %, ou null quando a base de comparação é zero/ausente. */
  function variacao(anterior, atual) {
    if (anterior == null || atual == null || anterior === 0) return null;
    return (atual / anterior - 1) * 100;
  }

  function agrupar(pedidos, chave, n) {
    const grupos = Array.from({ length: n }, () => []);
    for (const p of pedidos) grupos[p[chave]].push(p);
    return grupos.map(totais);
  }

  /* Série de 24 meses (jan/2023–dez/2024) com totais por mês. */
  function serieMensal(pedidos) { return agrupar(pedidos, 'mes', 24); }

  function porAno(pedidos) {
    return { 2023: totais(pedidos.filter(p => p.ano === 2023)), 2024: totais(pedidos.filter(p => p.ano === 2024)) };
  }

  /* Indicadores por segmento (mercado ou categoria), com crescimento 2024 × 2023 do próprio segmento. */
  function segmentos(base, chave) {
    const nomes = chave === 'mercado' ? base.mercados : base.categorias;
    return nomes.map((nome, i) => {
      const lista = base.pedidos.filter(p => p[chave] === i);
      const t = totais(lista), a = porAno(lista);
      const t3 = totais(lista.filter(p => p.ano === 2024 && p.trimestre === 3));
      const t4 = totais(lista.filter(p => p.ano === 2024 && p.trimestre === 4));
      const est = lista.reduce((s, p) => s + p.estoque, 0);
      return {
        indice: i, nome, ...t, anos: a,
        crescReceita: variacao(a[2023].centavos, a[2024].centavos),
        crescUnidades: variacao(a[2023].unidades, a[2024].unidades),
        crescPedidos: variacao(a[2023].pedidos, a[2024].pedidos),
        t3Unidades: t3.unidades, t4Unidades: t4.unidades,
        varT4T3Unidades: variacao(t3.unidades, t4.unidades),
        estoqueMedio: lista.length ? est / lista.length : null,
        receitaMediaMensalCentavos: t.centavos / 24
      };
    });
  }

  /* Ranking com empates: mesma posição para valores iguais (1, 2, 3, 4, 4, 6). */
  function ranquear(itens, valor) {
    const ord = itens.slice().sort((a, b) => valor(b) - valor(a) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return ord.map((it, i) => {
      const v = valor(it);
      const posicao = 1 + ord.filter(o => valor(o) > v).length;
      const empate = ord.some(o => o !== it && valor(o) === v);
      return { item: it, posicao, empate, ordem: i };
    });
  }

  function correlacao(x, y) {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxy / Math.sqrt(sxx * syy);
  }

  function indiceMaximo(v) { let m = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[m]) m = i; return m; }

  /* ---------- Médias móveis ----------
     serie: 24 valores mensais (jan/2023–dez/2024).
     Validação: previsão de um mês à frente para cada mês de 2024, só com meses anteriores.
     Projeção: três passos recursivos após dez/2024, sem arredondamentos intermediários. */
  function mediaMovel(serie, k) {
    let somaAbs = 0, somaPct = 0;
    const validacao = [];
    for (let i = 12; i < 24; i++) {
      let s = 0; for (let j = i - k; j < i; j++) s += serie[j];
      const previsto = s / k;
      somaAbs += Math.abs(serie[i] - previsto); somaPct += Math.abs((serie[i] - previsto) / serie[i]);
      validacao.push(previsto);
    }
    const estendida = serie.slice(), previsao = [], janelas = [];
    for (let h = 0; h < 3; h++) {
      const ini = estendida.length - k;
      let s = 0; for (let j = ini; j < estendida.length; j++) s += estendida[j];
      janelas.push([ini, estendida.length - 1]);
      const p = s / k; previsao.push(p); estendida.push(p);
    }
    return { k, mae: somaAbs / 12, mape: somaPct / 12 * 100, validacao, previsao, janelas, total: previsao[0] + previsao[1] + previsao[2] };
  }

  /* ---------- Formatação pt-BR ---------- */
  const cache = {};
  const nf = d => cache[d] || (cache[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const MENOS = '−';
  const fmt = {
    num: (v, d = 0) => (v < 0 ? MENOS : '') + nf(d).format(Math.abs(v)),
    brl: (reais, d = 2) => (reais < 0 ? MENOS : '') + 'R$ ' + nf(d).format(Math.abs(reais)),
    cent: (centavos, d = 2) => fmt.brl(centavos / 100, d),
    mi: (centavos, d = 2) => 'R$ ' + nf(d).format(centavos / 1e8) + ' mi',
    mil: (reais, d = 0) => 'R$ ' + nf(d).format(reais / 1000) + ' mil',
    pct: (v, d = 2, sinal = true) => v == null ? 'Sem comparação disponível' : (v > 0 && sinal ? '+' : v < 0 ? MENOS : '') + nf(d).format(Math.abs(v)) + '%',
    seta: v => v == null ? '' : v > 0 ? '▲' : v < 0 ? '▼' : '■'
  };

  const Calc = { MESES, MESES_LONGOS, criarBase, filtrar, totais, variacao, serieMensal, porAno, segmentos, ranquear, correlacao, indiceMaximo, mediaMovel, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc; else raiz.Calc = Calc;
})(typeof globalThis !== 'undefined' ? globalThis : this);
