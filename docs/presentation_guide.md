# Guia de Preparação para Apresentação à Banca (20 Minutos)

Este guia foi elaborado para apoiar o(a) candidato(a) durante a videoconferência técnica do processo seletivo do **Assistente de Curadoria do Catálogo**, fornecendo roteiros específicos e respostas de defesa técnica para os diferentes perfis da banca (Product Owners e Tech Leads).

---

## 1. Pitch de Abertura (3 Minutos - Foco em Produto & Negócio)

> **Dica**: Fale de forma clara e orientada a valor, sem entrar em jargão de código nos primeiros minutos.

*   **O Problema**: "Hoje, nossos times de editorial, vendas e marketing perdem horas preciosas folheando arquivos soltos ou pedindo ajuda mútua para encontrar livros que atendam a demandas específicas dos leitores ou livrarias parceiras (ex: *'indique um livro infantil focado em ecologia de 6 a 10 anos publicado recentemente'*). Isso causa atrito, perda de vendas e lentidão no atendimento."
*   **A Oportunidade**: "Criar um curador interno inteligente que consolida todo o catálogo oficial da editora e responde qualquer dúvida comercial, de marketing ou de suporte técnico em segundos."
*   **A Solução**: "Construímos o *Assistente de Curadoria do Catálogo*. Uma aplicação onde qualquer colaborador digita uma dúvida e recebe em menos de 1 segundo uma curadoria detalhada em markdown estruturado, com ganchos comerciais de venda ativa e referências clicáveis ligadas ao livro real do acervo. A interface é viva, mostrando de forma transparente as etapas de decisão da inteligência."
*   **O Retorno**: "Aumento na conversão de vendas B2B, redução no tempo de atendimento a leitores e maior consistência na comunicação das campanhas de marketing."

---

## 2. Roteiro do Demo ao Vivo (5 Minutos)

Para a demonstração ao vivo, execute estas 3 perguntas em sequência para cobrir todas as categorias principais:

### Pergunta 1: Similaridade Semântica (Recomendação de Tema)
*   **Texto a digitar**: *"Quais romances contemporâneos e dramas marcantes ambientados no Brasil ou na Europa são recomendados para nosso público-alvo adulto?"*
*   **O que mostrar na tela**:
    1.  Como o assistente recomenda livros específicos (como *Corações sob o Céu de Outono* [5] e *O Último Café em Paris* [6]).
    2.  Clique no link da citação no texto (ex: `[5]`) para abrir a ficha técnica correspondente na barra lateral de detalhes.
    3.  Mostre os metadados bibliográficos completos (ISBN, preço, ganchos de marketing).

### Pergunta 2: Busca Exata e Léxica (FTS)
*   **Texto a digitar**: *"Quem escreveu o livro O Segredo da Quinta da Colina?"*
*   **O que mostrar na tela**:
    1.  Como o RAG localiza instantaneamente o livro `13` por correspondência exata de título.
    2.  O assistente responde com precisão factual que o autor é *Artur de Souza*.
    3.  Aponte para o pipeline de processamento na interface gráfica, mostrando a etapa **Busca de Candidatos** concluída com sucesso.

### Pergunta 3: Tratamento de Exceção (Pergunta Fora do Catálogo)
*   **Texto a digitar**: *"Como fazer um bolo de cenoura com cobertura de chocolate?"*
*   **O que mostrar na tela**:
    1.  A resposta educada de recusa amigável, explicando que a pergunta está fora do escopo do catálogo da editora.
    2.  Mostre que as referências estão vazias (`references: []`), provando que a IA não alucinou obras culinárias inexistentes.
    3.  Abra a etapa **Pergunta Recebida** no pipeline gráfico e mostre a intenção classificada como `OUT_OF_CATALOG`.

---

## 3. Defesa de Decisões Técnicas (7 Minutos - Foco em Engenharia)

> **Dica**: Prepare-se para detalhar estes 4 pilares quando os Tech Leads questionarem a arquitetura.

### A. Por que Busca Híbrida (PostgreSQL FTS + pgvector)?
*   **Explicação**: "Busca vetorial pura (distância de cosseno) falha em encontrar termos precisos (como nomes próprios de autores raros ou ISBNs específicos). A busca léxica (Full Text Search) pura falha em capturar intenção semântica e sinônimos. Combinamos ambas em paralelo usando o **índice GIN** para texto e o **índice HNSW** para pgvector, mesclando-as via **RRF (Reciprocal Rank Fusion)**. Isso nos dá o melhor de dois mundos: precisão factual de palavra-chave e compreensão semântica profunda."

### B. Por que Agentes Lógicos customizados ao invés de CrewAI ou LangGraph?
*   **Explicação**: "Para o escopo de um MVP de catálogo com fluxo linear estruturado, frameworks como CrewAI ou LangGraph adicionam complexidade desnecessária, dependências mutáveis e alta latência de rede. Ao desenhar os agentes como classes lógicas em Python puro estruturadas em camadas (`IntentAgent`, `RetrievalAgent`, `RerankerAgent`, `GenerationAgent`, `ValidationAgent`), garantimos controle total das regras, latência mínima e rastreabilidade fácil do Correlation ID."

### C. Como foi mitigado o risco de Alucinação?
*   **Explicação**: "Implementamos o **`ValidationAgent`**. Ele atua como um portão de segurança pós-geração. Ele varre a resposta em busca de referências `[id]`. Se encontrar algum ID que não conste na lista de livros fornecida pelo banco, ou se o LLM-as-Judge detectar contradições factuais contra os metadados dos livros, a resposta é rejeitada e reinicia-se o fluxo de geração com feedback de correção. Isso impede que ganchos falsos cheguem ao usuário final."

### D. Como funciona a Observabilidade do sistema?
*   **Explicação**: "Todo request gera um `Request-ID` e propaga um `Correlation-ID`. Se um colaborador relatar um erro na curadoria, podemos filtrar instantaneamente os logs estruturados no Splunk/Datadog. Além disso, criamos a rota `/metrics` no FastAPI que retorna latência média por request e taxas de chamadas e tempos individuais por agente lógico."

---

## 4. Custos e Escalabilidade (5 Minutos)

### Análise de Custos em Produção
*   **Custo por Requisição**: ~**\$0.00177** (Menos de 1 centavo de real por curadoria) utilizando o modelo `GPT-4o-mini` do OpenRouter.
*   **Previsão Mensal**: Com 10.000 requisições mensais de funcionários internos, o custo de API de LLM seria de apenas **\$17.70** (aproximadamente R$ 90,00 reais), tornando o sistema extremamente rentável.

### Plano de Evolução (Próximos Passos)
1.  **Cache Semântico (Redis)**: Cachear curadorias comuns usando busca por proximidade vetorial no Redis para responder a perguntas repetidas em <50ms com custo zero de token de LLM.
2.  **Ingestão de Alto Volume**: Substituir a ingestão síncrona atual por um pipeline em batch assíncrono paralelo com controle de concorrência (`asyncio.Semaphore`), adequado para catálogos com mais de 50.000 livros.

---

## 5. Perguntas Frequentes da Banca (FAQ)

### ❓ Perguntas dos Product Owners (Negócio/Produto)

*   **P: E se o usuário fizer uma pergunta muito vaga, como 'qual o melhor romance'? Como o produto se comporta?**
    *   *R*: "O IntentAgent classificará como `RECOMMENDATION`. O sistema recuperará os romances do catálogo. O Reranker reduzirá para os top 5 e o GenerationAgent estruturará ganchos explicando o motivo de cada romance se destacar (por exemplo, por ser sucesso no BookTok). Se a busca retornar resultados fracos, o módulo de busca híbrida aplica fallbacks (ILIKE e, em último caso, retorno amplo do catálogo) antes do rerank."
*   **P: O que você priorizou e o que deixou de fora por causa do tempo?**
    *   *R*: "Priorizei a robustez do pipeline de recuperação híbrida (FTS + pgvector) com RRF e a validação factual de não alucinação, pois sem precisão o produto perde a utilidade para o time editorial. Deixei de fora autenticação e histórico multi-turno (chat de conversa), pois o MVP foca no fluxo de curadoria direta pontual de forma estável."

### ❓ Perguntas dos Tech Leads (Engenharia/Infra)

*   **P: Por que usar HNSW em vez de IVFFlat na tabela do pgvector?**
    *   *R*: "O IVFFlat requer treinamento prévio e recalibração à medida que novos livros são adicionados ao banco, sofrendo perda de precisão se a lista crescer organicamente sem recriação do índice. O HNSW constrói uma estrutura de grafos dinâmica durante inserções (`INSERT`), fornecendo buscas rápidas de vizinhos com excelente relação de recall sem custos operacionais de retreinamento periódico."
*   **P: O que acontece se a API do OpenRouter falhar ou ficar offline?**
    *   *R*: "O backend retorna erro HTTP e o frontend exibe mensagem de indisponibilidade. Não há resposta simulada: a curadoria depende do pipeline completo com LLM. O timeout foi configurado em 120 segundos para acomodar a latência do pipeline multiagente."
