"""Extrai os 2.250 pedidos da planilha original para dados/pedidos.json.

Uso (na raiz do projeto):
    python scripts/extrair_dados.py

Lê documentos/Estudo_Caso_Fast_Fashion_ModaGlobal_20261028090016.xlsx sem
dependências externas (o .xlsx é um ZIP com XML) e grava um JSON compacto,
em colunas, que o build incorpora ao site. Interrompe com erro se a base não
passar nas verificações de qualidade descritas no relatório.
"""
import datetime
import json
import pathlib
import re
import sys
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / 'documentos' / 'Estudo_Caso_Fast_Fashion_ModaGlobal_20261028090016.xlsx'
DESTINO = RAIZ / 'dados' / 'pedidos.json'

MERCADOS = ['Brasil', 'México', 'Argentina', 'Colômbia', 'Peru', 'Chile']
CATEGORIAS = ['Acessórios', 'Moda Feminina', 'Calçados', 'Moda Infantil', 'Moda Masculina']
COLUNAS = ['ID Pedido', 'Data', 'Mercado', 'Categoria', 'Quantidade Vendida',
           'Preço Unitário (R$)', 'Faturamento (R$)', 'Estoque Atual']


def ler_planilha(caminho):
    z = zipfile.ZipFile(caminho)
    ler = lambda nome: re.sub(r'<(/?)x:', r'<\1', z.read(nome).decode('utf-8-sig'))
    textos = []
    if 'xl/sharedStrings.xml' in z.namelist():
        textos = [''.join(re.findall(r'<t[^>]*>([^<]*)</t>', si))
                  for si in re.findall(r'<si>(.*?)</si>', ler('xl/sharedStrings.xml'), re.S)]
    folha = ler('xl/worksheets/sheet1.xml')
    linhas = []
    for linha in re.findall(r'<row[^>]*>(.*?)</row>', folha, re.S):
        valores = []
        for c in re.finditer(r'<c r="[A-Z]+\d+"([^>]*?)(?:/>|>(.*?)</c>)', linha, re.S):
            attrs, dentro = c.group(1), c.group(2) or ''
            v = re.search(r'<v>([^<]*)</v>', dentro)
            v = v.group(1) if v else None
            if 't="s"' in attrs and v is not None:
                v = textos[int(v)]
            elif 'inlineStr' in attrs:
                v = ''.join(re.findall(r'<t[^>]*>([^<]*)</t>', dentro))
            valores.append(v)
        linhas.append(valores)
    return linhas


def data_excel(v):
    try:
        return datetime.date(1899, 12, 30) + datetime.timedelta(days=float(v))
    except ValueError:
        return datetime.date.fromisoformat(v[:10])


def main():
    linhas = ler_planilha(ORIGEM)
    cab, corpo = linhas[0], [l for l in linhas[1:] if any(l)]
    if cab[:8] != COLUNAS:
        sys.exit(f'Cabeçalho inesperado: {cab}')
    ids, registros, divergencias = set(), [], 0
    for l in corpo:
        if len(l) < 8 or any(v in (None, '') for v in l[:8]):
            sys.exit(f'Linha com valor ausente: {l}')
        pid, data, merc, cat, qtd, preco, fat, est = l[:8]
        if pid in ids:
            sys.exit(f'ID repetido: {pid}')
        ids.add(pid)
        d = data_excel(data)
        if not (2023 <= d.year <= 2024):
            sys.exit(f'Data fora do período: {d}')
        cent = round(float(fat) * 100)
        if abs(float(qtd) * float(preco) - float(fat)) > 0.005:
            divergencias += 1
        registros.append([(d.year - 2023) * 12 + d.month - 1, MERCADOS.index(merc), CATEGORIAS.index(cat),
                          int(float(qtd)), cent, int(float(est))])
    if divergencias:
        sys.exit(f'{divergencias} pedidos com faturamento diferente de quantidade × preço')
    registros.sort()
    total = sum(r[4] for r in registros)
    meses = sorted({r[0] for r in registros})
    saida = {
        'fonte': ORIGEM.name,
        'descricao': 'Um item por pedido: [mês 0–23 (jan/2023–dez/2024), mercado, categoria, unidades, faturamento em centavos, estoque registrado].',
        'mercados': MERCADOS,
        'categorias': CATEGORIAS,
        'colunas': ['mes', 'mercado', 'categoria', 'unidades', 'centavos', 'estoque'],
        'pedidos': registros,
    }
    DESTINO.write_text(json.dumps(saida, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(registros)} pedidos · {sum(r[3] for r in registros)} unidades · R$ {total / 100:,.2f} · {len(meses)} meses → {DESTINO.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
