# Moda Global · site de apresentação

Trabalho da UniRitter, unidade curricular Análise de Dados e Big Data. O site conduz a apresentação: uma narrativa contínua, com gráficos que permanecem fixos enquanto os passos mudam o que está em destaque. Os números são calculados a partir dos 2.250 pedidos da base original.

## Como abrir

- **Sem instalar nada:** abra `index.html` no Chrome ou no Edge. Dados, fontes e imagens estão embutidos; funciona sem internet.
- **Com os links de download dos documentos:** sirva a pasta e acesse `http://localhost:8000`.

```bash
python -m http.server 8000
```

## Como reconstruir

```bash
python scripts/extrair_dados.py
```

```bash
python scripts/build.py
```

```bash
node --test tests/calculos.test.js
```

- `extrair_dados.py` lê `documentos/Estudo_Caso_Fast_Fashion_ModaGlobal_20261028090016.xlsx` e grava `dados/pedidos.json`. Interrompe se houver ID repetido, valor ausente ou faturamento diferente de quantidade × preço.
- `build.py` gera `index.html` (autocontido) e `dist/artifact.html` (versão para o Artifact, sem links locais).
- O teste confere os agregados com os números do relatório: panorama, mercados, categorias, T4/T3, estoque, picos, correlação, MM3/MM6/MM12, filtros e formatação pt-BR.
- `dados/mapa.json` já acompanha o projeto. Para regenerá-lo: `npm install` e depois `npm run mapa`.

## Estrutura

| Caminho | Função |
| --- | --- |
| `src/pagina.html` | Marcação e textos do percurso |
| `src/estilos.css` | Direção de arte, layout responsivo e movimento |
| `src/calculos.js` | Funções puras: filtros, totais, ranking com empates, médias móveis, formatação |
| `src/app.js` | Cenas: abertura, tempo, mercados, categorias, limites, previsão, explorador, decisões, navegação e modo Apresentar |
| `dados/` | Pedidos extraídos da planilha e contornos do mapa |
| `assets/` | Fontes (Bricolage Grotesque e Manrope) e duas fotografias ilustrativas |
| `documentos/` | Relatório e planilhas do trabalho, para download |
| `versoes-anteriores/` | Versão em slides e versão landing page |

Sem bibliotecas de terceiros no navegador. O scrollytelling usa `position: sticky` e `IntersectionObserver`; as animações usam transições CSS e `requestAnimationFrame`. Essa base cobre as três cenas centrais (ranking, categorias, previsão) sem acrescentar GSAP ou React a um arquivo que precisa abrir offline.

## Uso na apresentação

- Rolagem normal funciona em todo o site. O cabeçalho leva a cada capítulo e ao explorador.
- **Apresentar** amplia um pouco o texto, esconde o menu e mostra controles Anterior/Próximo por ponto narrativo (24 pontos). Com o modo ativo, ← → ou PageUp/PageDown avançam e voltam; Esc sai. Espaço e setas para cima/baixo continuam com o comportamento do navegador. Os atalhos não atuam dentro de campos de formulário.
- **Reduzir animações** mostra todos os estados finais sem movimento; o site também respeita a preferência do sistema.

## O que é interativo

Tudo funciona com mouse (passar), toque (tocar; tocar fora fecha) e teclado (Tab para chegar, setas nos gráficos de linha e barras mensais, Esc para fechar a dica).

| Onde | Interação |
| --- | --- |
| Abertura | Os quatro números são seletores: mostram o detalhe 2023 × 2024 e trocam a fita de 24 meses entre faturamento, pedidos e unidades. Cada mês da fita mostra faturamento, pedidos, unidades e ticket |
| Tempo | Cursor mês a mês com os dois anos e a variação; alternância faturamento/unidades |
| Mercados | Cada país do ranking e do mapa abre uma ficha com todos os indicadores e posições; seletor de métrica |
| Categorias | Participação ou valores absolutos nos três totais; dica com as três medidas; barras divergentes com unidades de origem; clique abre os números completos |
| Limites | Dicas no faturamento × lucro e no estoque médio (com número de registros); o esquema produto + local + data explica cada lacuna |
| Previsão | Cursor no gráfico mostra observado ou previsto e a janela usada; os meses previstos são botões que destacam a janela e mostram a conta; dicas nos erros de MM3/MM6/MM12 |
| Explorar dados | Filtros, cursor mês a mês do recorte e barras de participação clicáveis que aplicam o filtro (navegação em profundidade) |
| Decisões | “Ver a evidência” volta à cena que sustenta cada prioridade |

## Roteiro sugerido (≈ 11 minutos)

| Capítulo | Tempo | Pontos a dizer |
| --- | --- | --- |
| Abertura | 0:45 | Pergunta do trabalho; R$ 6,23 mi, 2.250 pedidos, 56.782 unidades, 6 mercados e 5 categorias; a fita mostra os 24 meses |
| Tempo | 1:30 | +10,09% de receita, +5,67% de pedidos, +7,53% de unidades; picos em jul/2023 e jun/2024; sem evidência de sazonalidade recorrente |
| Mercados | 2:00 | Brasil lidera pedidos e faturamento; Chile tem o maior ticket; Colômbia cresce mais; Chile e Colômbia para pilotos; Argentina em segundo plano |
| Categorias | 1:45 | Acessórios lidera o acumulado; Moda Feminina e Calçados sobem nas duas janelas; Acessórios e Moda Infantil recuam no T4; Moda Masculina tem sinal misto |
| Limites | 1:00 | Mercado mais lucrativo e estoque total não podem ser determinados com esta base |
| Previsão | 2:00 | Fronteira em dez/2024; janela da MM12; passos recursivos; R$ 821.646,52; MAPE de 7,16% como erro histórico, não garantia |
| Explorar dados | 0:45 | Demonstrar um filtro (ex.: 2024 · Chile) e o painel proposto |
| Decisões | 1:15 | Três prioridades e plano proposto de 90 dias |

Perguntas: a tabela completa dos mercados, o método da previsão e o explorador servem de apoio.

## Fontes e créditos

- Relatório do grupo, planilha original e planilha de gráficos e métricas (pasta `documentos/`).
- Hyndman e Athanasopoulos, *Forecasting: principles and practice*, 2021; Chang e Grady, *NIST Big Data Interoperability Framework*, 2019 (referências do relatório).
- Fotografias: Pexels, licença Pexels, uso ilustrativo. Mapa: Natural Earth (domínio público), via world-atlas.
- Autores: Guilherme Perlasca, Marcelo Duarte, Thiago Roncoli, Daniel Chiaramonte, Henrique Souza, Filipe Brito e Diego Moreira. Professor: Andres Eberhard Friedl Ackermann.
