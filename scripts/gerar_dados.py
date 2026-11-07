import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validar_dados

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA_PADRAO = RAIZ / "data" / "pnad_tic.json"
SAIDA_PADRAO = RAIZ / "data" / "dados.js"
PREFIXO = "window.DADOS = "


def _arredondar(valor):
    return round(valor + 0.0, 1)


def _anos(valores):
    return sorted(valores.keys(), key=int)


def fonte_curta(fonte):
    titulo = fonte["titulo"]
    if ":" in titulo:
        base = titulo.split(":")[0]
        referencia = fonte.get("referencia")
        return f"{base} TIC, ref. {referencia}" if referencia else base
    return titulo.split(" (")[0]


def calcular_derivados(dados):
    series = dados["series"]
    derivados = {"variacao": {}, "gap_urbano_rural": {}, "fora": {}, "fontes_curtas": {}}

    for id_fonte, fonte in dados["fontes"].items():
        derivados["fontes_curtas"][id_fonte] = fonte_curta(fonte)

    for id_serie, serie in series.items():
        anos = _anos(serie["valores"])
        if len(anos) < 2:
            continue
        atual, anterior = anos[-1], anos[-2]
        derivados["variacao"][id_serie] = {
            "ano_atual": atual,
            "ano_anterior": anterior,
            "atual": serie["valores"][atual],
            "anterior": serie["valores"][anterior],
            "delta": _arredondar(serie["valores"][atual] - serie["valores"][anterior]),
            "unidade": serie["unidade"],
        }

    urbano = series["internet_urbano"]["valores"]
    rural = series["internet_rural"]["valores"]
    for ano in _anos({a: None for a in urbano if a in rural}):
        derivados["gap_urbano_rural"][ano] = _arredondar(urbano[ano] - rural[ano])

    for id_serie in ("internet_pessoas", "internet_urbano", "internet_rural", "internet_60mais"):
        derivados["fora"][id_serie] = {
            ano: _arredondar(100 - valor) for ano, valor in series[id_serie]["valores"].items()
        }
    derivados["fora"]["recortes_2025"] = {
        id_recorte: {cat: _arredondar(100 - valor) for cat, valor in recorte["valores"].items()}
        for id_recorte, recorte in dados["recortes_2025"].items()
        if recorte["unidade"] == "%"
    }

    renda = dados["recortes_2025"]["renda_per_capita"]["valores"]
    derivados["renda_razao_pct"] = _arredondar((renda["Com Internet"] / renda["Sem Internet"] - 1) * 100)

    for id_bloco in validar_dados.BLOCOS_MOTIVOS:
        derivados.setdefault("soma_motivos", {})[id_bloco] = _arredondar(
            sum(dados[id_bloco]["valores"].values())
        )
    return derivados


def montar(dados):
    saida = dict(dados)
    saida["derivados"] = calcular_derivados(dados)
    return saida


def renderizar(dados):
    corpo = json.dumps(montar(dados), ensure_ascii=False, indent=1, sort_keys=False)
    return f"{PREFIXO}{corpo};\n"


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    verificar = "--check" in argv
    argumentos = [a for a in argv if not a.startswith("--")]
    entrada = Path(argumentos[0]) if len(argumentos) > 0 else ENTRADA_PADRAO
    saida = Path(argumentos[1]) if len(argumentos) > 1 else SAIDA_PADRAO

    dados = validar_dados.carregar(entrada)
    erros = validar_dados.validar(dados)
    if erros:
        print("Dados inválidos, nada foi gerado:")
        for erro in erros:
            print(f"  {erro}")
        return 1

    conteudo = renderizar(dados)
    if verificar:
        atual = saida.read_text(encoding="utf-8") if saida.exists() else None
        if atual != conteudo:
            print(f"{saida} está desatualizado. Rode: python3 scripts/gerar_dados.py")
            return 1
        print(f"{saida} está atualizado")
        return 0

    saida.write_text(conteudo, encoding="utf-8")
    print(f"Gerado {saida} ({len(conteudo)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
