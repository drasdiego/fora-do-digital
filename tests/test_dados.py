import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "scripts"))

import gerar_dados
import validar_dados

JSON_REAL = RAIZ / "data" / "pnad_tic.json"
DADOS_JS = RAIZ / "data" / "dados.js"


def dados_reais():
    return copy.deepcopy(validar_dados.carregar(JSON_REAL))


class ValidadorTest(unittest.TestCase):
    def test_dados_reais_sao_validos(self):
        self.assertEqual(validar_dados.validar(dados_reais()), [])

    def test_percentual_acima_de_100(self):
        dados = dados_reais()
        dados["series"]["internet_pessoas"]["valores"]["2025"] = 100.5
        erros = validar_dados.validar(dados)
        self.assertTrue(any("fora de 0 a 100" in e for e in erros))

    def test_percentual_negativo(self):
        dados = dados_reais()
        dados["recortes_2025"]["sexo"]["valores"]["Homens"] = -1
        self.assertTrue(any("fora de 0 a 100" in e for e in validar_dados.validar(dados)))

    def test_unidade_diferente_de_percentual_aceita_valor_alto(self):
        dados = dados_reais()
        self.assertGreater(dados["recortes_2025"]["renda_per_capita"]["valores"]["Com Internet"], 100)
        self.assertEqual(validar_dados.validar(dados), [])

    def test_fonte_inexistente_em_serie(self):
        dados = dados_reais()
        dados["series"]["internet_rural"]["fonte"] = "nao_existe"
        self.assertTrue(any("não existe em fontes" in e for e in validar_dados.validar(dados)))

    def test_fonte_ausente_em_recorte(self):
        dados = dados_reais()
        del dados["recortes_2025"]["area"]["fonte"]
        self.assertTrue(any("sem fonte" in e for e in validar_dados.validar(dados)))

    def test_fonte_por_ano_inexistente(self):
        dados = dados_reais()
        dados["series"]["internet_pessoas"]["fonte_por_ano"]["2023"] = "fantasma"
        self.assertTrue(any("fonte_por_ano" in e for e in validar_dados.validar(dados)))

    def test_anos_fora_de_ordem_em_serie(self):
        dados = dados_reais()
        dados["series"]["internet_pessoas"]["valores"] = {"2025": 90.5, "2016": 66.0}
        self.assertTrue(any("fora de ordem" in e for e in validar_dados.validar(dados)))

    def test_anos_fora_de_ordem_em_finalidades(self):
        dados = dados_reais()
        dados["finalidades"]["anos"] = ["2025", "2024", "2022", "2019", "2016"]
        self.assertTrue(any("fora de ordem" in e for e in validar_dados.validar(dados)))

    def test_lista_com_tamanho_diferente_dos_anos(self):
        dados = dados_reais()
        dados["equipamentos"]["valores"]["Celular"] = [94.7, 98.6]
        self.assertTrue(any("um por ano" in e for e in validar_dados.validar(dados)))

    def test_motivos_de_pessoas_precisam_somar_100(self):
        dados = dados_reais()
        dados["motivos_pessoas_2025"]["valores"]["Outro"] = 7.5
        self.assertTrue(any("somam" in e for e in validar_dados.validar(dados)))

    def test_motivos_de_pessoas_aceitam_tolerancia(self):
        dados = dados_reais()
        dados["motivos_pessoas_2025"]["valores"]["Outro"] = 6.7
        self.assertEqual(validar_dados.validar(dados), [])

    def test_motivos_de_domicilios_nao_podem_passar_de_100(self):
        dados = dados_reais()
        dados["motivos_domicilios_2025"]["valores"]["Serviço caro"] = 60.0
        self.assertTrue(any("acima de 100" in e for e in validar_dados.validar(dados)))

    def test_chave_vazia(self):
        dados = dados_reais()
        dados["recortes_2025"]["sexo"]["valores"][""] = 50.0
        self.assertTrue(any("chave vazia" in e for e in validar_dados.validar(dados)))

    def test_texto_vazio(self):
        dados = dados_reais()
        dados["notas"][0] = "  "
        self.assertTrue(any("texto vazio" in e for e in validar_dados.validar(dados)))

    def test_travessao_proibido(self):
        dados = dados_reais()
        dados["notas"][0] = "Pessoas " + chr(0x2014) + " 10 anos ou mais"
        self.assertTrue(any("travessão" in e for e in validar_dados.validar(dados)))

    def test_bloco_obrigatorio_ausente(self):
        dados = dados_reais()
        del dados["finalidades"]
        self.assertTrue(any("finalidades" in e for e in validar_dados.validar(dados)))

    def test_null_so_vale_em_finalidades(self):
        dados = dados_reais()
        dados["series"]["internet_pessoas"]["valores"]["2024"] = None
        self.assertTrue(any("null" in e for e in validar_dados.validar(dados)))
        dados = dados_reais()
        self.assertIsNone(dados["finalidades"]["valores"]["Redes sociais"][0])
        self.assertEqual(validar_dados.validar(dados), [])

    def test_codigo_de_saida_do_script(self):
        with tempfile.TemporaryDirectory() as pasta:
            ruim = Path(pasta) / "ruim.json"
            dados = dados_reais()
            dados["series"]["internet_pessoas"]["valores"]["2025"] = 120
            ruim.write_text(json.dumps(dados), encoding="utf-8")
            saida_ruim = subprocess.run(
                [sys.executable, str(RAIZ / "scripts" / "validar_dados.py"), str(ruim)],
                capture_output=True,
                text=True,
            )
        saida_boa = subprocess.run(
            [sys.executable, str(RAIZ / "scripts" / "validar_dados.py")], capture_output=True, text=True
        )
        self.assertEqual(saida_ruim.returncode, 1)
        self.assertEqual(saida_boa.returncode, 0)

    def test_arquivo_inexistente(self):
        self.assertEqual(validar_dados.main(["/caminho/que/nao/existe.json"]), 1)


class GeradorTest(unittest.TestCase):
    def test_derivados_de_gap(self):
        derivados = gerar_dados.calcular_derivados(dados_reais())
        self.assertEqual(derivados["gap_urbano_rural"]["2016"], 37.5)
        self.assertEqual(derivados["gap_urbano_rural"]["2025"], 8.5)
        self.assertEqual(list(derivados["gap_urbano_rural"]), ["2016", "2019", "2023", "2024", "2025"])

    def test_derivados_de_variacao(self):
        variacao = gerar_dados.calcular_derivados(dados_reais())["variacao"]
        self.assertEqual(variacao["internet_pessoas"]["delta"], 1.3)
        self.assertEqual(variacao["sem_internet_milhoes"]["delta"], -2.3)
        self.assertEqual(variacao["internet_60mais"]["ano_anterior"], "2024")

    def test_derivados_de_quem_esta_fora(self):
        fora = gerar_dados.calcular_derivados(dados_reais())["fora"]
        self.assertEqual(fora["internet_60mais"]["2025"], 25.5)
        self.assertEqual(fora["internet_pessoas"]["2025"], 9.5)
        self.assertEqual(fora["recortes_2025"]["instrucao"]["Sem instrução"], 49.9)
        self.assertNotIn("renda_per_capita", fora["recortes_2025"])

    def test_razao_de_renda(self):
        self.assertEqual(gerar_dados.calcular_derivados(dados_reais())["renda_razao_pct"], 75.7)

    def test_soma_dos_motivos(self):
        soma = gerar_dados.calcular_derivados(dados_reais())["soma_motivos"]
        self.assertEqual(soma["motivos_pessoas_2025"], 100.0)
        self.assertEqual(soma["motivos_domicilios_2025"], 95.5)

    def test_fontes_curtas(self):
        curtas = gerar_dados.calcular_derivados(dados_reais())["fontes_curtas"]
        self.assertEqual(curtas["tic2025"], "IBGE, PNAD Contínua TIC, ref. 4º trimestre de 2025")
        self.assertEqual(set(curtas), set(dados_reais()["fontes"]))

    def test_saida_e_javascript_com_json_valido(self):
        conteudo = gerar_dados.renderizar(dados_reais())
        self.assertTrue(conteudo.startswith("window.DADOS = "))
        self.assertTrue(conteudo.endswith(";\n"))
        corpo = conteudo[len("window.DADOS = ") : -2]
        carregado = json.loads(corpo)
        self.assertEqual(carregado["series"]["internet_pessoas"]["valores"]["2025"], 90.5)
        self.assertIn("derivados", carregado)

    def test_gerador_nao_altera_valores_originais(self):
        original = dados_reais()
        carregado = json.loads(gerar_dados.renderizar(original)[len("window.DADOS = ") : -2])
        carregado.pop("derivados")
        self.assertEqual(carregado, original)

    def test_geracao_e_deterministica(self):
        self.assertEqual(gerar_dados.renderizar(dados_reais()), gerar_dados.renderizar(dados_reais()))

    def test_dados_js_do_repositorio_esta_atualizado(self):
        self.assertTrue(DADOS_JS.exists())
        self.assertEqual(DADOS_JS.read_text(encoding="utf-8"), gerar_dados.renderizar(dados_reais()))

    def test_gerador_recusa_dados_invalidos(self):
        with tempfile.TemporaryDirectory() as pasta:
            entrada = Path(pasta) / "entrada.json"
            saida = Path(pasta) / "saida.js"
            dados = dados_reais()
            dados["series"]["internet_pessoas"]["fonte"] = "inexistente"
            entrada.write_text(json.dumps(dados), encoding="utf-8")
            codigo = gerar_dados.main([str(entrada), str(saida)])
            self.assertEqual(codigo, 1)
            self.assertFalse(saida.exists())

    def test_modo_check(self):
        with tempfile.TemporaryDirectory() as pasta:
            saida = Path(pasta) / "dados.js"
            self.assertEqual(gerar_dados.main([str(JSON_REAL), str(saida)]), 0)
            self.assertEqual(gerar_dados.main(["--check", str(JSON_REAL), str(saida)]), 0)
            saida.write_text("window.DADOS = {};\n", encoding="utf-8")
            self.assertEqual(gerar_dados.main(["--check", str(JSON_REAL), str(saida)]), 1)


if __name__ == "__main__":
    unittest.main()
