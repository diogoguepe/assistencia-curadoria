# Detalhamento Arquitetural (ADRs & Decisões Técnicas)

Este diretório contém a documentação detalhada das decisões técnicas tomadas para o **Assistente de Curadoria do Catálogo**, estruturada para avaliação de Tech Leads e Product Owners.

---

## 1. ADR 01: Escolha dos Índices do Banco de Dados (GIN + HNSW)

### Contexto
O assistente requer buscas textuais eficientes (para encontrar ISBNs exatos, termos específicos de autoria ou ganchos promocionais) e buscas semânticas (para compreender conceitos latentes de sinopse ou público-alvo). 

### Decisão
Implementamos a busca híbrida utilizando o PostgreSQL com dois índices especializados:

1.  **GIN (Generalized Inverted Index)**:
    *   **Onde**: Aplicado em uma coluna calculada `fts_vector` (que agrega `title`, `authors`, `genres` e `synopsis` usando `to_tsvector` em português).
    *   **Porquê**: Permite busca de texto completo indexada extremamente rápida para buscas lexicais e palavras-chave.
2.  **HNSW (Hierarchical Navigable Small World)**:
    *   **Onde**: Aplicado na coluna de embeddings de 1536 dimensões (`embedding`) utilizando a extensão `pgvector`.
    *   **Porquê**: A busca aproximada de vizinhos mais próximos (ANN) baseada em grafos HNSW é substancialmente mais veloz em datasets crescentes do que buscas exatas via índice IVFFlat, fornecendo alta precisão sem comprometer latência.

---

## 2. ADR 02: Fusão de Resultados via Reciprocal Rank Fusion (RRF)

### Contexto
Temos dois rankings ordenados de relevância provenientes do FTS e da busca vetorial. Precisamos combinar essas duas listas de candidatos em um único ranking consolidado para alimentar o agente de re-ranqueamento.

### Decisão
Implementamos o **RRF (Reciprocal Rank Fusion)** com parâmetro de suavização $k=60$. 

A pontuação de cada documento $d$ é dada por:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

*   **Benefícios**: 
    *   Não requer calibração complexa de pesos relativos de pontuações de similaridade de cosseno (que variam de 0 a 1) versus pontuações do `ts_rank` do Postgres (que são irrestritas).
    *   Garante relevância ao penalizar posições inferiores em qualquer sistema de busca e priorizar itens que ranqueiam bem em múltiplos pipelines.

---

## 3. ADR 03: Arquitetura Multiagente Baseada em Objetos Lógicos

### Contexto
A especificação solicita agentes lógicos (Orchestrator, Intent, Retrieval, Reranker, Generation, Validation) para a condução estruturada da curadoria.

### Decisão
Optou-se por implementar os agentes como classes síncronas/assíncronas acopladas de forma modular no próprio processo Python, em vez de containers separados ou processos paralelos do sistema operacional.

*   **Porquê**:
    *   **Latência Mínima**: Evita sobrecarga de transporte por rede ou mensagens IPC entre containers.
    *   **Facilidade de Depuração**: Permite ler e acompanhar logs sequenciais integrados com Correlation IDs e rastreamento de pilha (Stack Trace) simples.
    *   **Explicabilidade**: A cadeia sequencial permite medir latências individuais exatas de cada etapa e repassar esses dados limpos para a barra de pipeline do frontend.

---

## 4. Observabilidade & Rastreabilidade de Requisições

Para garantir a rastreabilidade em produção:
*   Cada requisição HTTP gera um UUID próprio (`Request-ID`) e propaga um UUID de correlação (`Correlation-ID`).
*   Todos os registros de logs utilizam esses identificadores para permitir filtros centralizados de fluxo em softwares de gerenciamento de log (como Splunk ou Datadog).
*   Ao fim de cada chamada, dados sobre o tempo de execução e a resposta gerada são salvos de forma persistente na tabela `query_logs` para fins de auditoria de qualidade.
