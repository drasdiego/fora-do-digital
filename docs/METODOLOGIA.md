# Metodologia

Este documento explica de onde vêm os números do painel Fora do Digital, o que foi calculado pelo projeto e o que o dado não permite dizer.

## Fonte e universo

Todos os valores vêm da PNAD Contínua (Pesquisa Nacional por Amostra de Domicílios Contínua), módulo TIC (Tecnologia da Informação e Comunicação), do IBGE (Instituto Brasileiro de Geografia e Estatística). A fonte principal é o informativo "Acesso à Internet e à televisão e posse de telefone móvel celular para uso pessoal 2025", com referência no 4º trimestre de 2025 e divulgação em 02/07/2026.

O universo é de pessoas de 10 anos ou mais. "Usou a internet" significa ter usado nos três meses anteriores à entrevista.

Os números foram transcritos do informativo para `data/pnad_tic.json` e conferidos contra o texto e os gráficos do documento. A cobertura de imprensa da divulgação serviu só como segunda conferência e não alimenta nenhum gráfico.

## Fato, leitura e limitação

O painel separa três tipos de afirmação:

1. **Fato.** Um número que está em `data/pnad_tic.json`, sempre acompanhado da fonte.
2. **Leitura.** Uma recomendação do projeto para quem desenha atendimento. É escrita em linguagem condicional e não é resultado da pesquisa.
3. **Limitação.** O que o número não permite concluir.

## Séries e revisões

O IBGE revisa a série a cada divulgação. Por isso:

- Cada ponto de cada série tem uma fonte. O campo `fonte_por_ano` marca os pontos que vêm de uma divulgação anterior.
- Pontos de divulgação anterior aparecem com marcador vazado nos gráficos e com asterisco nas tabelas. No dado atual, são 2023 (todas as séries de percentual de pessoas) e 2016 (urbano e rural), vindos do informativo de 2024.
- Esses pontos podem diferir um pouco da série revisada em 2025. O painel não tenta corrigi-los.

A série de percentual de pessoas não tem todos os anos. Os anos sem dado (por exemplo 2017, 2018 e 2020 a 2022) não são interpolados. Os trechos entre pontos que não são anos seguidos aparecem tracejados, e o eixo horizontal usa o ano real, com espaçamento proporcional.

Nas finalidades de uso, onde a pesquisa não trouxe o item em certo ano, o valor é `null` no JSON. O gráfico mostra lacuna, nunca zero.

## Recortes

Região, área, idade, instrução, sexo e cor ou raça são mostrados um de cada vez. A pesquisa publicada não permite combinar recortes (por exemplo, idosos em área rural) sem acesso aos microdados.

Os recortes de idade, instrução e cor ou raça são listas parciais: contêm as categorias que constam nos dados do projeto, não todas as do recorte original.

## Cálculos feitos pelo projeto

Todos os cálculos ficam em `scripts/gerar_dados.py` e são gravados no bloco `derivados` de `data/dados.js`. O navegador só lê esses valores.

| Cálculo | Fórmula | Uso |
| --- | --- | --- |
| Variação contra o ano anterior | valor do último ano menos valor do ano anterior disponível na série, arredondado a uma casa | Cartões de indicadores |
| Gap entre urbano e rural | percentual urbano menos percentual rural, nos anos em que os dois existem | Gráfico principal |
| Pessoas fora da internet | 100 menos o percentual que usou | Cartões de atendimento e simulador |
| Razão de renda | (renda com internet dividida pela renda sem internet menos 1) vezes 100 | Cartão de renda |
| Soma dos motivos | soma dos percentuais listados | Nota sob o gráfico de motivos |

"p.p." significa pontos percentuais, a diferença aritmética entre dois percentuais.

## Motivos para não usar

Os motivos de pessoas somam 100% (com tolerância de 0,2 p.p. no validador). Os motivos de domicílios e de quem não tem celular somam menos de 100% nos dados do projeto, e o painel mostra essa soma. O restante não consta nos dados e não é estimado.

## Simulador "Sua base de clientes"

A conta é `base × (100 - percentual que usou) ÷ 100`, com o percentual nacional do perfil escolhido. Ela é uma estimativa simples:

- aplica o percentual do Brasil, da região, da área, da faixa de 60 anos ou mais ou de quem não tem instrução à base inteira;
- usa um perfil por vez, sem combinar perfis;
- não conhece a composição real da base de clientes;
- vale para pessoas de 10 anos ou mais.

O resultado serve como ordem de grandeza para uma conversa, não como previsão.

## Margem de erro

A PNAD Contínua é uma pesquisa por amostra. Os percentuais são estimativas com margem de erro, e o informativo não traz essa margem em todas as quebras. Diferenças pequenas entre categorias, como a de sexo, devem ser lidas com cautela.

## Estrutura do JSON

- `fontes`: título, link, período de referência e data de divulgação.
- `series`: séries anuais com `valores` por ano, `unidade`, `fonte` e, quando preciso, `fonte_por_ano`.
- `recortes_2025`: percentuais por categoria em 2025, com `nota` quando o informativo traz uma observação.
- `motivos_pessoas_2025`, `motivos_domicilios_2025`, `sem_celular_motivos_2025`: motivos principais.
- `finalidades` e `equipamentos`: listas alinhadas à lista de `anos`.

## Validação

`scripts/validar_dados.py` falha com código 1 se algum dos pontos abaixo não for respeitado:

- todo percentual está entre 0 e 100;
- toda série, recorte e bloco tem fonte que existe em `fontes`, inclusive em `fonte_por_ano`;
- os anos estão em ordem crescente e as listas têm um valor por ano;
- os motivos de pessoas somam 100, com tolerância de 0,2;
- não há chave nem texto vazio;
- nenhum texto contém travessão, pela regra de escrita do projeto.

`tests/test_dados.py` cobre o validador e o gerador. O CI roda a validação, os testes e confere que `data/dados.js` está atualizado.

## Acessibilidade

- Cada gráfico tem rótulo descritivo e uma tabela alternativa em "Ver dados em tabela".
- O gráfico de linhas aceita teclado: foco no gráfico, setas para percorrer os anos, Home e End para os extremos, Escape para fechar.
- As cores têm contraste mínimo de 4,5:1 para texto, e o significado nunca depende só de cor (formas de marcador, rótulos e texto acompanham).
- O painel respeita `prefers-reduced-motion`.

## Exportação

O botão "Baixar dados (CSV)" gera no navegador um CSV em formato longo (bloco, indicador, rótulo, categoria, ano, valor, unidade, fonte, divulgação anterior). O separador decimal é o ponto, e valores ausentes são omitidos.
