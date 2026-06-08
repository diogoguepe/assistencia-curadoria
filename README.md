# Assistente de Curadoria do Catálogo (Backend & IA)

Este repositório contém a solução corporativa completa de backend, banco de dados e inteligência artificial para o **Assistente de Curadoria do Catálogo**, desenhado para apoiar os times internos de Comercial, Editorial, Marketing e Atendimento ao Cliente na recomendação e exploração do catálogo de publicações.

A solução foi projetada de forma profissional sob os princípios de **Clean Architecture**, **Domain Driven Design (DDD)**, orquestração multiagente lógica e busca híbrida avançada.

---

## 1. Visão Geral da Arquitetura

O sistema é dividido em três camadas desacopladas que se integram de forma assíncrona:

```
[ Frontend (Vite + React SPA) ]
            ↓ POST /api/ask (JSON)  ·  POST /api/ask/stream (SSE)
[ Backend (FastAPI Layer) ]
            ↓ (Orquestração de Agentes)
[ Camada de IA (Multi-Agent Engine) ] ──(OpenRouter API)──> [ GPT-4o-mini & Text-Embedding-3 ]
            ↓ (Hybrid Search: FTS + Vetorial)
[ Banco de Dados (PostgreSQL + pgvector) ]
```

### Endpoints de Curadoria

| Endpoint | Método | Formato | Uso |
|----------|--------|---------|-----|
| `/api/ask` | POST | JSON | Contrato principal exigido pela prova. Retorna resposta completa de uma vez. |
| `/ask` | POST | JSON | Alias de `/api/ask`. |
| `/api/ask/stream` | POST | SSE | Streaming em tempo real dos passos do pipeline + resultado final. Usado pela interface web. |
| `/ask/stream` | POST | SSE | Alias de `/api/ask/stream`. |

Payload de entrada (todos os endpoints de curadoria):

```json
{ "question": "Sua pergunta em linguagem natural" }
```

### Decisões de Design & Padrões Adotados
1. **Desacoplamento do Provedor de IA**: Criou-se a abstração `BaseAIProvider` em `ai/providers/base_provider.py`. Toda a lógica dos agentes consome essa interface, permitindo trocar o provedor (ex: de OpenRouter para Google Vertex AI, AWS Bedrock ou modelos locais) sem alterar nenhuma regra de negócio.
2. **Busca Híbrida com Fusão RRF**: Em vez de depender apenas de busca semântica (vetores) ou busca sintática (palavras-chave), implementamos ambas em paralelo. Os resultados são unificados através de **Reciprocal Rank Fusion (RRF)** com $k=60$, garantindo relevância lexical e conceitual ao mesmo tempo.
3. **Validação Pós-Geração (Self-Correction)**: O `ValidationAgent` audita o texto final do `GenerationAgent`. Ele verifica de forma programática se as citações (como `[1]`, `[2]`) batem estritamente com os livros do banco e usa o LLM para auditar contradições do catálogo. Caso detecte uma falha, solicita a regeneração da resposta (com até 2 retentativas).

---

## 2. Fluxo Multiagente (Mermaid)

O processamento cognitivo de uma pergunta segue o grafo de execução abaixo:

```mermaid
graph TD
    User([Pergunta do Usuário]) --> Orchestrator[Orchestrator Agent]
    
    subgraph Agents [Fluxo de Agentes Lógicos]
        Orchestrator --> Intent[Intent Agent]
        
        Intent -->|Classifica Intenção| CheckIntent{Intenção Fora?}
        CheckIntent -->|Sim: OUT_OF_CATALOG| GenDirect[Generation Agent]
        CheckIntent -->|Não: Busca Acervo| Retrieval[Retrieval Agent]
        
        Retrieval -->|Busca Híbrida PostgreSQL| Candidates[FTS GIN + Vector HNSW]
        Candidates -->|Fusão RRF k=60| Top20[Top 20 Livros]
        
        Top20 --> Rerank[Reranker Agent]
        Rerank -->|Ordenação e Filtro| Top5[Top 5 Livros]
        
        Top5 --> Gen[Generation Agent]
        Gen -->|Gera Markdown c/ Citações| Validate[Validation Agent]
        
        Validate -->|Auditoria de Citações e Fatos| CheckValid{Aprovado?}
        CheckValid -->|Não: Solicita Correção| Gen
        CheckValid -->|Sim| Return[Retorna Curação Consolidada]
    end
    
    GenDirect --> Return
    Return --> Orchestrator
    Orchestrator --> ReturnPayload([Payload do Contrato do Frontend])
```

---

## 3. Modelo de Dados & Índices

### Tabela `books`
*   `id`: Identificador principal (IDs `"1"` a `"20"`).
*   `title`, `authors`, `genres`, `target_audience`, `synopsis`: Metadados enriquecidos para o catálogo.
*   `price`, `pages`, `isbn`, `tags`, `marketing_hooks`, `cover_color`: Dados exigidos pelo layout do frontend.
*   `embedding`: Vetor de `1536` dimensões (Gerado via `text-embedding-3-small` sobre documento concatenado contendo todos os metadados do livro).
*   `fts_vector`: Coluna gerada em tempo de inserção que armazena a representação léxica em português dos campos textuais.

### Estrutura de Índices (DDL PostgreSQL)
*   **BTree**: Criado implicitamente na Primary Key `id` e explicitamente em `isbn` para buscas diretas.
*   **GIN (Generalized Inverted Index)**: Criado na coluna `fts_vector` para pesquisas de texto completo rápidas:
    ```sql
    CREATE INDEX books_fts_idx ON books USING GIN (fts_vector);
    ```
*   **HNSW (Hierarchical Navigable Small World)**: Criado na coluna de embeddings para busca aproximada de vizinhos mais próximos (ANN) com similaridade de cosseno:
    ```sql
    CREATE INDEX books_embedding_hnsw_idx ON books USING hnsw (embedding vector_cosine_ops);
    ```

---

## 4. Trade-offs Arquiteturais

### Busca Híbrida (FTS + Vetores) vs. Apenas Vetores
*   **Apenas Vetores**: Ótimo para buscas conceituais (ex: "livro sobre amor em Ouro Preto"), mas falha miseravelmente em buscas por termos exatos (ex: buscar pelo ISBN "978-85-1234-567-5" ou nome do autor "Tio Gustavo").
*   **Abordagem Híbrida**: A busca textual FTS entrega precisão cirúrgica em identificação de termos e ISBNs exatos, enquanto a busca vetorial brilha no entendimento semântico. A fusão **RRF** unifica os pontos fortes de ambos.

### Agentes Lógicos vs. Agentes Autônomos (LangGraph/CrewAI)
*   **Frameworks Pesados (CrewAI/LangGraph)**: Adicionam alta complexidade, latência de rede adicional em loops e acoplamento a padrões mutáveis de terceiros.
*   **Agentes Lógicos em Python Puro**: Implementados como classes Python assíncronas simples. Garantem **baixo acoplamento**, **latência mínima**, controle total do fluxo determinístico e facilidade extrema de depuração.

---

## 5. Estimativa de Custos (OpenRouter API)

Assumindo a utilização do modelo recomendado **GPT-4o-mini** para orquestração geral e geração:

*   **Embeddings** (`text-embedding-3-small`): ~\$0.00002 / 1k tokens.
    *   Custo de indexar 20 livros: menos de \$0.01 de dólar.
*   **Orquestração de Agentes (Por Pergunta)**:
    *   `IntentAgent`: ~250 tokens in / ~50 tokens out.
    *   `RerankerAgent`: ~2500 tokens in / ~100 tokens out.
    *   `GenerationAgent`: ~2500 tokens in / ~500 tokens out.
    *   `ValidationAgent`: ~3500 tokens in / ~50 tokens out.
    *   **Total por request**: ~9000 tokens de entrada / ~700 tokens de saída.
    *   Utilizando GPT-4o-mini (\$0.150/M tokens input e \$0.600/M tokens output):
        *   Custo de entrada por chamada: \$0.00135
        *   Custo de saída por chamada: \$0.00042
        *   **Custo total estimado por pergunta**: ~\$0.00177 (Menos de 1 centavo de real brasileiro por curadoria completa).

---

## 6. Limitações & Roadmap

### Limitações Atuais
1.  **Indexação Síncrona**: O script de ingestão gera embeddings em loop síncrono por livro. Para catálogos massivos (>10.000 livros), isso causaria gargalo de taxa limite de requisições (Rate Limits).
2.  **Volatilidade do OpenRouter**: Por ser um agregador de APIs, a latência do OpenRouter pode variar ligeiramente em picos de tráfego se comparado a uma integração de canal direto (ex: Google Cloud ou OpenAI Enterprise).
3.  **Dependência de API externa**: Perguntas de curadoria exigem `OPENROUTER_API_KEY` válida. Sem a chave, a ingestão usa embeddings sintéticos, mas o pipeline de agentes não responde.

### Roadmap de Evolução
*   [ ] **Ingestão em Lotes (Batches) Assíncronos**: Implementar paralelização via `asyncio.gather` com limitador de taxa (semáforos) no script de embeddings.
*   [ ] **Cache Semântico (Semantic Caching)**: Armazenar curadorias comuns em Redis utilizando similaridade vetorial para retornar respostas repetidas em <50ms sem gastar tokens.
*   [ ] **Histórico de Conversas (Memória)**: Expandir o `AgentOrchestrator` para suportar memória de conversa e permitir refinamentos na mesma pauta de curadoria.

---

## 7. Como Executar o Projeto

### Pré-requisitos
*   **Docker** e **Docker Compose** instalados.
*   Chave de API do **OpenRouter** configurada no ambiente (**obrigatória** para curadoria).

### Configurando o Ambiente

1. Copie o arquivo de exemplo na raiz do projeto:
```bash
cp .env.example .env
```

2. Edite `.env` e insira sua chave:
```bash
OPENROUTER_API_KEY="sua_chave_aqui"
```

### Inicializando via Docker Compose (Recomendado)

```bash
docker compose up --build
```

O startup do backend executa automaticamente:
1. Criação das tabelas e índices (pgvector, GIN, HNSW).
2. Ingestão dos 20 livros de `shared/books.json` **se o catálogo estiver vazio**.
3. Geração de embeddings via OpenRouter (ou vetores sintéticos se a chave estiver ausente).

Acesse o assistente em: **`http://localhost:3000`**

Verifique a saúde do sistema:
```bash
curl http://localhost:8000/health
# Esperado: {"status":"ok","database":"connected","catalogSize":20}
```

Teste o endpoint exigido pela prova:
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Quais livros de ficção científica temos no catálogo?"}'
```

### Inicializando Manualmente (Desenvolvimento Local)

1.  **Subir o banco PostgreSQL** com extensão `pgvector` e configurar `DATABASE_URL` no `.env`.
2.  **Instalar dependências Python**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Executar ingestão** (ou deixar o startup do backend fazer automaticamente):
    ```bash
    PYTHONPATH=. python ai/ingest/ingest_books.py
    ```
4.  **Iniciar o Backend FastAPI**:
    ```bash
    uvicorn backend.app.main:app --reload --port 8000
    ```
5.  **Iniciar o Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 8. Testes Automatizados

```bash
# Unitários do backend (API)
pytest

# Unitários do frontend
cd frontend && npx vitest run

# E2E do ciclo de feedback (requer Docker Compose em execução)
python tests/e2e/feedback_cycle.py
```

---

## 9. Módulo de Avaliação (Auditoria Offline)

O módulo em `ai/evaluation` permite medir de forma científica a acurácia da curadoria RAG.

Para rodar os testes offline (Recall@5, Precision@5 e LLM-as-Judge):
```bash
PYTHONPATH=. python3 ai/evaluation/evaluator.py
```
O script gerará um relatório detalhado em **`ai/evaluation/results.csv`**, incluindo justificativas de notas do Juiz LLM e latências de resposta, pronto para apresentação aos Tech Leads e Product Owners.

Relatório complementar de auditoria manual: `ai/evaluation/manual_evaluation.md`.
