import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA_PADRAO = RAIZ / "data" / "pnad_tic.json"
TRAVESSOES = (chr(0x2014), chr(0x2013))
BLOCOS_RAIZ = (
    "projeto",
    "atualizado_em",
    "fontes",
    "notas",
    "series",
    "recortes_2025",
    "motivos_pessoas_2025",
    "motivos_domicilios_2025",
    "sem_celular_motivos_2025",
    "finalidades",
    "equipamentos",
)
BLOCOS_MOTIVOS = ("motivos_pessoas_2025", "motivos_domicilios_2025", "sem_celular_motivos_2025")
TOLERANCIA_SOMA = 0.2


def carregar(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _percentual_valido(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and 0 <= valor <= 100


def _numero(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)


def _chaves_vazias(no, caminho, erros):
    if isinstance(no, dict):
        for chave, valor in no.items():
            if not isinstance(chave, str) or not chave.strip():
                erros.append(f"{caminho}: chave vazia")
            _chaves_vazias(valor, f"{caminho}.{chave}", erros)
    elif isinstance(no, list):
        for indice, valor in enumerate(no):
            _chaves_vazias(valor, f"{caminho}[{indice}]", erros)
    elif isinstance(no, str):
        if not no.strip():
            erros.append(f"{caminho}: texto vazio")
        if any(t in no for t in TRAVESSOES):
            erros.append(f"{caminho}: contém travessão, que a regra de escrita do projeto proíbe")


def _anos_em_ordem(anos, caminho, erros):
    try:
        numeros = [int(a) for a in anos]
    except (TypeError, ValueError):
        erros.append(f"{caminho}: ano que não é inteiro")
        return
    if numeros != sorted(set(numeros)):
        erros.append(f"{caminho}: anos fora de ordem ou repetidos: {list(anos)}")


def _checar_fonte(bloco, caminho, fontes, erros):
    fonte = bloco.get("fonte")
    if not fonte:
        erros.append(f"{caminho}: sem fonte")
    elif fonte not in fontes:
        erros.append(f"{caminho}: fonte '{fonte}' não existe em fontes")
    for ano, fonte_ano in (bloco.get("fonte_por_ano") or {}).items():
        if fonte_ano not in fontes:
            erros.append(f"{caminho}.fonte_por_ano.{ano}: fonte '{fonte_ano}' não existe em fontes")
        if ano not in (bloco.get("valores") or {}):
            erros.append(f"{caminho}.fonte_por_ano.{ano}: ano sem valor na série")


def _checar_valores(unidade, valor, caminho, erros):
    if valor is None:
        return
    if not _numero(valor):
        erros.append(f"{caminho}: valor não numérico: {valor!r}")
    elif unidade == "%" and not _percentual_valido(valor):
        erros.append(f"{caminho}: percentual fora de 0 a 100: {valor}")


def validar(dados):
    erros = []
    if not isinstance(dados, dict):
        return ["raiz do JSON precisa ser um objeto"]
    _chaves_vazias(dados, "raiz", erros)
    for chave in BLOCOS_RAIZ:
        if chave not in dados or dados[chave] in (None, "", {}, []):
            erros.append(f"raiz: bloco obrigatório ausente ou vazio: {chave}")
    if erros and any("bloco obrigatório" in e for e in erros):
        return erros

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(dados["atualizado_em"])):
        erros.append("atualizado_em: use o formato AAAA-MM-DD")

    fontes = dados["fontes"]
    for id_fonte, fonte in fontes.items():
        for campo in ("titulo", "url"):
            if not fonte.get(campo):
                erros.append(f"fontes.{id_fonte}: campo {campo} ausente")
        if not str(fonte.get("url", "")).startswith("https://"):
            erros.append(f"fontes.{id_fonte}: url precisa começar com https://")

    for id_serie, serie in dados["series"].items():
        caminho = f"series.{id_serie}"
        _checar_fonte(serie, caminho, fontes, erros)
        valores = serie.get("valores") or {}
        _anos_em_ordem(list(valores.keys()), f"{caminho}.valores", erros)
        for ano, valor in valores.items():
            if valor is None:
                erros.append(f"{caminho}.{ano}: série anual não aceita null")
            _checar_valores(serie.get("unidade"), valor, f"{caminho}.{ano}", erros)

    for id_recorte, recorte in dados["recortes_2025"].items():
        caminho = f"recortes_2025.{id_recorte}"
        _checar_fonte(recorte, caminho, fontes, erros)
        for categoria, valor in (recorte.get("valores") or {}).items():
            if valor is None:
                erros.append(f"{caminho}.{categoria}: valor ausente")
            _checar_valores(recorte.get("unidade"), valor, f"{caminho}.{categoria}", erros)

    for id_bloco in BLOCOS_MOTIVOS:
        bloco = dados[id_bloco]
        _checar_fonte(bloco, id_bloco, fontes, erros)
        valores = bloco.get("valores") or {}
        for categoria, valor in valores.items():
            _checar_valores("%", valor, f"{id_bloco}.{categoria}", erros)
        soma = sum(v for v in valores.values() if _numero(v))
        if id_bloco == "motivos_pessoas_2025":
            if abs(soma - 100) > TOLERANCIA_SOMA:
                erros.append(f"{id_bloco}: motivos somam {soma:.1f}, esperado 100 com tolerância de {TOLERANCIA_SOMA}")
        elif soma > 100 + TOLERANCIA_SOMA:
            erros.append(f"{id_bloco}: motivos somam {soma:.1f}, acima de 100")

    for id_bloco in ("finalidades", "equipamentos"):
        bloco = dados[id_bloco]
        _checar_fonte(bloco, id_bloco, fontes, erros)
        anos = bloco.get("anos") or []
        _anos_em_ordem(anos, f"{id_bloco}.anos", erros)
        for categoria, lista in (bloco.get("valores") or {}).items():
            caminho = f"{id_bloco}.{categoria}"
            if not isinstance(lista, list) or len(lista) != len(anos):
                erros.append(f"{caminho}: precisa ter {len(anos)} valores, um por ano")
                continue
            for ano, valor in zip(anos, lista):
                _checar_valores(bloco.get("unidade"), valor, f"{caminho}.{ano}", erros)
    return erros


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    caminho = Path(argv[0]) if argv else ENTRADA_PADRAO
    try:
        dados = carregar(caminho)
    except (OSError, json.JSONDecodeError) as excecao:
        print(f"Falha ao ler {caminho}: {excecao}")
        return 1
    erros = validar(dados)
    if erros:
        print(f"{len(erros)} problema(s) em {caminho}:")
        for erro in erros:
            print(f"  {erro}")
        return 1
    print(f"Dados válidos: {caminho}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
