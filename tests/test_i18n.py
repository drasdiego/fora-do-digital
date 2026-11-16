import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
JSON_REAL = RAIZ / "data" / "pnad_tic.json"
DADOS_JS = RAIZ / "data" / "dados.js"
I18N_JS = RAIZ / "assets" / "i18n.js"
PAINEL_JS = RAIZ / "assets" / "painel.js"
INDEX_HTML = RAIZ / "index.html"


def bloco_json(texto, nome):
    inicio = texto.index("window." + nome + " = ") + len("window." + nome + " = ")
    objeto, _ = json.JSONDecoder().raw_decode(texto[inicio:])
    return objeto


def rotulos_traduziveis(dados):
    achados = []
    for fonte in dados["fontes"].values():
        achados.append(fonte["titulo"])
        achados.append(fonte["referencia"])
    achados.extend(dados["notas"])
    for serie in dados["series"].values():
        achados.append(serie["rotulo"])
    for recorte in dados["recortes_2025"].values():
        achados.append(recorte["rotulo"])
        achados.extend(recorte["valores"].keys())
        if "nota" in recorte:
            achados.append(recorte["nota"])
    for chave in ("motivos_pessoas_2025", "motivos_domicilios_2025", "sem_celular_motivos_2025", "finalidades", "equipamentos"):
        achados.append(dados[chave]["rotulo"])
        achados.extend(dados[chave]["valores"].keys())
    return achados


class DicionarioTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.i18n = I18N_JS.read_text(encoding="utf-8")
        cls.dados_trad = bloco_json(cls.i18n, "I18N_DADOS")
        cls.estatico = bloco_json(cls.i18n, "I18N_ESTATICO")
        cls.dados = json.loads(JSON_REAL.read_text(encoding="utf-8"))
        cls.derivados_js = DADOS_JS.read_text(encoding="utf-8")

    def test_todo_texto_dos_dados_tem_traducao_em_ingles(self):
        faltando = [t for t in rotulos_traduziveis(self.dados) if t not in self.dados_trad]
        self.assertEqual(faltando, [])

    def test_fontes_curtas_tem_traducao_em_ingles(self):
        derivados = bloco_json(self.derivados_js, "DADOS")["derivados"]
        faltando = [t for t in derivados["fontes_curtas"].values() if t not in self.dados_trad]
        self.assertEqual(faltando, [])

    def test_traducao_de_dados_sem_chave_orfa(self):
        derivados = bloco_json(self.derivados_js, "DADOS")["derivados"]
        usados = set(rotulos_traduziveis(self.dados)) | set(derivados["fontes_curtas"].values())
        orfas = [k for k in self.dados_trad if k not in usados]
        self.assertEqual(orfas, [])

    def test_traducao_de_dados_nao_vazia(self):
        vazias = [k for k, v in self.dados_trad.items() if not v.strip()]
        self.assertEqual(vazias, [])

    def test_estaticos_tem_pt_e_en(self):
        for chave, entrada in self.estatico.items():
            self.assertEqual(sorted(entrada), ["en", "pt"], chave)
            if chave != "fonte-em-portugues":
                self.assertTrue(entrada["pt"].strip(), chave)
                self.assertTrue(entrada["en"].strip(), chave)

    def test_frases_tem_pt_e_en(self):
        trecho = self.i18n[self.i18n.index("window.I18N_FRASES"):]
        chaves = re.findall(r'F\["([\w-]+)"\] = \{', trecho)
        self.assertGreater(len(chaves), 30)
        for chave in chaves:
            inicio = trecho.index('F["' + chave + '"] = {')
            fim = trecho.find('F["', inicio + 5)
            corpo = trecho[inicio:fim if fim > 0 else len(trecho)]
            self.assertRegex(corpo, r"\bpt: function", chave)
            self.assertRegex(corpo, r"\ben: function", chave)

    def test_toda_chave_usada_no_painel_existe(self):
        painel = PAINEL_JS.read_text(encoding="utf-8")
        trecho = self.i18n[self.i18n.index("window.I18N_FRASES"):]
        frases = set(re.findall(r'F\["([\w-]+)"\] = \{', trecho))
        existentes = set(self.estatico) | frases
        usadas = set(re.findall(r'msg\(\s*"([\w-]+)"', painel))
        dinamicas = {k for k in usadas if k.endswith("-")}
        faltando = sorted(k for k in usadas - dinamicas if k not in existentes)
        self.assertEqual(faltando, [])
        self.assertEqual(dinamicas, {"kpi-"})
        for sufixo in ("internet_pessoas", "sem_internet_milhoes", "internet_domicilios", "celular_pessoas", "internet_60mais", "internet_rural"):
            self.assertIn("kpi-" + sufixo, self.estatico)
        for sufixo in ("regiao", "area", "idade", "instrucao", "sexo", "cor_raca", "pessoas", "domicilios", "celular"):
            self.assertIn("segmento-" + sufixo, self.estatico)

    def test_chaves_do_html_existem_e_portugues_bate_com_o_dicionario(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        for atributo, modo in (("data-i18n", "texto"), ("data-i18n-html", "html")):
            padrao = re.compile(r"<(\w+)\b([^>]*?)\s" + atributo + r'="([\w-]+)"([^>]*)>')
            for m in padrao.finditer(html):
                tag, chave = m.group(1), m.group(3)
                self.assertIn(chave, self.estatico, chave)
                nivel, pos = 1, m.end()
                abre = re.compile(r"<" + tag + r"\b[^>]*>|</" + tag + r">")
                for x in abre.finditer(html, pos):
                    nivel += 1 if not x.group(0).startswith("</") else -1
                    if nivel == 0:
                        interno = html[pos:x.start()]
                        break
                esperado = self.estatico[chave]["pt"]
                normal = lambda t: re.sub(r"\s+", " ", t).strip()
                self.assertEqual(normal(interno), normal(esperado), chave)
        for atributo, alvo in (("data-i18n-aria", "aria-label"), ("data-i18n-title", "title")):
            padrao = re.compile(r"<[^>]*?" + atributo + r'="([\w-]+)"[^>]*>')
            for m in padrao.finditer(html):
                chave = m.group(1)
                self.assertIn(chave, self.estatico, chave)
                valor = re.search(r"\s" + alvo + r'="([^"]*)"', m.group(0)).group(1)
                self.assertEqual(valor, self.estatico[chave]["pt"], chave)

    def test_seletor_de_idioma_no_html(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        self.assertIn('role="group" aria-label="Idioma"', html)
        self.assertIn('lang="pt" aria-label="PT, Português" aria-current="true" class="on"', html)
        self.assertIn('lang="en" aria-label="EN, English"', html)

    def test_sem_travessao_nos_textos_de_idioma(self):
        self.assertNotIn("—", self.i18n)
        self.assertNotIn("–", self.i18n)

    def test_ingles_nao_usa_formato_numerico_brasileiro(self):
        for chave, traducao in self.dados_trad.items():
            self.assertNotRegex(traducao, r"\d,\d", chave)


if __name__ == "__main__":
    unittest.main()
