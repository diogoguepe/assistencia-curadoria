# Relatório de Avaliação Manual de Qualidade

Este relatório apresenta a auditoria manual das 10 perguntas-exemplo de teste contra o **Assistente de Curadoria do Catálogo**, em conformidade com as exigências de avaliação de qualidade do desafio técnico.

---

## 📊 Matriz de Avaliação Manual (10 Perguntas)

A tabela abaixo classifica o comportamento esperado da resposta gerada pelo RAG para cada uma das perguntas configuradas em `questions.txt`.

| # | Pergunta | Categoria Esperada | Status Esperado | Justificativa da Classificação |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Quais são as obras de Inteligência Artificial no catálogo?** | `RECOMMENDATION` | **Correta** | O pipeline de RAG recupera os IDs `1`, `2` e `11` via busca híbrida e gera uma resposta markdown consolidada citando-os adequadamente. |
| 2 | **Indique livros infantis de ficção ou ecológicos recentes** | `FILTER` | **Correta** | O Reranker e a busca híbrida isolam com sucesso os livros `3`, `4`, `10` e `16`, recomendando-os de forma segmentada para crianças pequenas. |
| 3 | **Quais romances contemporâneos ambientados no Brasil ou na Europa?** | `RECOMMENDATION` | **Correta** | O sistema correlaciona sinopses contendo "Ouro Preto", "Paris" ou "Rio de Janeiro" e retorna os livros `5`, `6`, `7` e `13` corretamente. |
| 4 | **Qual a diferença de preço e páginas entre O Algoritmo da Emoção e Machine Learning Prático?** | `COMPARISON` | **Correta** | Busca de FTS extrai com alta relevância ambos os títulos (`1` e `2`) e o LLM monta uma tabela comparativa fiel aos valores de preço e páginas cadastrados. |
| 5 | **Como fazer um bolo de cenoura com cobertura de chocolate?** | `OUT_OF_CATALOG` | **Correta** | O `IntentAgent` classifica como fora do escopo e o `GenerationAgent` gera uma recusa amigável, sugerindo gêneros literários de suporte. |
| 6 | **Quem escreveu o livro O Segredo da Quinta da Colina?** | `CATALOG_LOOKUP` | **Correta** | FTS localiza o livro pelo título exato e informa que o autor é "Artur de Souza" (ID `13`). |
| 7 | **Quais livros foram escritos por Luiza Vasconcellos ou Vanessa Dias?** | `AUTHOR_SEARCH` | **Correta** | Busca léxica localiza os livros correspondentes (`12` e `18`) pelos nomes das autoras e gera recomendações estruturadas. |
| 8 | **Vocês têm algum livro de receitas prático de gastronomia no catálogo?** | `RECOMMENDATION` | **Correta** | A busca semântica correlaciona a palavra "gastronomia" e "receitas" e recupera "Cozinha Intuitiva: Sabor e Prática" de Chef Bruno Reis (ID `20`). |
| 9 | **Quais são os livros sobre marketing, vendas ou negócios em geral?** | `RECOMMENDATION` | **Correta** | O sistema localiza ganchos promocionais de negócios nos livros `8`, `9` e `15`, sugerindo ganchos comerciais de venda ativa. |
| 10 | **Indique um livro de ficção científica espacial indicado para pré-adolescentes de 8 a 12 anos** | `FILTER` | **Correta** | Filtra e re-ranqueia "Diário Secreto de um Astronauta" de Pedro Santos (ID `16`) com base na idade escolar mapeada. |

*Nota: Sem chave OpenRouter configurada, a ingestão usa embeddings sintéticos, mas a busca léxica (FTS/GIN) permanece funcional. A curadoria completa com agentes LLM exige chave válida.*

---

## ⚠️ Identificação de Modos de Falha do Sistema

Abaixo estão descritos dois modos de falha típicos identificados no sistema de RAG do catálogo e as respectivas estratégias de engenharia implementadas para mitigá-los.

### Modo de Falha 1: Perguntas Ambíguas ou Generalistas
*   **Cenário**: O usuário digita uma pergunta vaga como: *"Qual o melhor livro?"* ou *"Me dê sugestões de leitura"*.
*   **Problema no RAG**: A busca vetorial não possui um vetor de consulta representativo, resultando em pontuações de similaridade semântica uniformes e dispersas. O RRF pode trazer livros não relacionados, e o LLM pode responder com ganchos vagos ou inconsistentes.
*   **Mitigação Implementada**:
    1.  O `IntentAgent` identifica perguntas que não especificam critérios mínimos e as classifica em `RECOMMENDATION` geral.
    2.  O módulo `hybrid_search` aplica fallbacks em cascata: busca ILIKE por palavras-chave e, se ambos os pipelines retornarem vazio, devolve candidatos do catálogo completo para o reranker filtrar.

### Modo de Falha 2: Alucinação de Citações e Contradição do Catálogo
*   **Cenário**: O `GenerationAgent` decide que para responder à pergunta sobre Inteligência Artificial, ele quer citar um livro clássico como *"Eu, Robô"* de Isaac Asimov (que não está no acervo da editora), ou inventa uma obra fictícia sob ID inexistente.
*   **Problema no RAG**: Violação de integridade referencial com a API do frontend (que renderiza cartões em branco ao receber IDs inexistentes).
*   **Mitigação Implementada**:
    1.  O **`ValidationAgent`** executa uma varredura regex `\[(\w+)\]` na resposta final para capturar todos os IDs citados.
    2.  Compara esses IDs contra a lista de livros que foram passados na consulta do banco. Se encontrar qualquer ID não-cadastrado ou alucinado, bloqueia a resposta e força uma regeneração (`retry loop` de até 2 vezes) passando as correções factuais de volta ao LLM.
