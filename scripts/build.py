"""Gera o site autocontido.

Uso (na raiz do projeto):
    python scripts/build.py

Saídas:
    index.html                 página completa: estilos, scripts, dados, fontes e imagens embutidos
    dist/artifact.html         mesma página sem <html>/<head> e sem links para arquivos locais
"""
import base64
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC, ASSETS, DADOS = RAIZ / 'src', RAIZ / 'assets', RAIZ / 'dados'

IMAGENS = {'arara': 'arara-tons-claros.jpg', 'tecidos': 'tecidos-dobrados.jpg'}
FONTES = {'bricolage': 'bricolage-grotesque-latin-wght.woff2', 'manrope': 'manrope-latin-wght.woff2'}
DOCUMENTOS = [
    ('Trabalho_Academico_Moda_Global_ABNT.docx', 'Relatório do trabalho (ABNT)'),
    ('Estudo_Caso_Fast_Fashion_ModaGlobal_20261028090016.xlsx', 'Base original com 2.250 pedidos'),
    ('Moda_Global_Graficos_e_Metricas.xlsx', 'Gráficos e métricas'),
]


def uri(caminho, tipo):
    return f'data:{tipo};base64,' + base64.b64encode(caminho.read_bytes()).decode()


def montar(com_links):
    pagina = (SRC / 'pagina.html').read_text(encoding='utf-8')
    css = (SRC / 'estilos.css').read_text(encoding='utf-8')
    for chave, arq in FONTES.items():
        css = css.replace(f'@@FONTE:{chave}@@', uri(ASSETS / 'fontes' / arq, 'font/woff2'))
    app = (SRC / 'app.js').read_text(encoding='utf-8')
    app = app.replace('/*@@PEDIDOS@@*/null', (DADOS / 'pedidos.json').read_text(encoding='utf-8'))
    app = app.replace('/*@@MAPA@@*/null', (DADOS / 'mapa.json').read_text(encoding='utf-8'))
    if com_links:
        docs = ''.join(f'<li><a href="documentos/{a}" download>{t}</a> <small>({a.rsplit(".", 1)[1].upper()})</small></li>' for a, t in DOCUMENTOS)
    else:
        docs = ''.join(f'<li>{t} <small>({a})</small></li>' for a, t in DOCUMENTOS)
    # substituições por função: o conteúdo inserido não é interpretado como padrão de regex
    pagina = pagina.replace('/*@@CSS@@*/', css).replace('/*@@CALC@@*/', (SRC / 'calculos.js').read_text(encoding='utf-8'))
    pagina = pagina.replace('/*@@APP@@*/', app).replace('<!--@@DOCS@@-->', docs)
    pagina = re.sub(r'@@IMG:(\w+)@@', lambda m: uri(ASSETS / 'img' / IMAGENS[m.group(1)], 'image/jpeg'), pagina)
    restantes = re.findall(r'@@[A-Z]+[:\w]*@@', pagina)
    if restantes:
        raise SystemExit(f'Marcadores não substituídos: {restantes}')
    return pagina


def main():
    corpo = montar(com_links=True)
    i = corpo.index('<header')
    doc = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           '<meta name="description" content="Moda Global: como transformar 2.250 pedidos em decisões. Trabalho acadêmico UniRitter, Análise de Dados e Big Data.">\n'
           + corpo[:i] + '</head>\n<body>\n' + corpo[i:] + '\n</body>\n</html>\n')
    (RAIZ / 'index.html').write_text(doc, encoding='utf-8')
    (RAIZ / 'dist').mkdir(exist_ok=True)
    (RAIZ / 'dist' / 'artifact.html').write_text(montar(com_links=False), encoding='utf-8')
    print(f'index.html {len(doc) // 1024} KB · dist/artifact.html')


if __name__ == '__main__':
    main()
