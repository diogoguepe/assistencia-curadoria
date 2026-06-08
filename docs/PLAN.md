# Plano de Arquitetura: Retenção do DB Local (Estratégia para Tech Challenge)

## Objetivo
Garantir que o projeto seja 100% autossuficiente e reprodutível para a banca avaliadora. Como o projeto não vai para a nuvem e será testado localmente pelos avaliadores, o uso de um banco PostgreSQL embutido no Docker (Self-Contained) é a estratégia mais profissional e segura, descartando a dependência do Supabase.

## Análise Estratégica (O Debate)
- **O Erro da Avaliação Anterior:** Assumimos que o projeto iria para produção real. Para produção, Supabase é ótimo. Para um *Take-Home Challenge*, depender do Supabase é um **tiro no pé**.
- **Por que o DB Local no Docker é superior para esta prova:**
  1. **Reprodutibilidade (O "Funciona na minha máquina"):** Os avaliadores só precisam rodar `docker-compose up`. Eles não precisam ter acesso à internet liberado para portas de banco de dados na AWS, nem lidar com firewalls corporativos bloqueando o Supabase.
  2. **Segurança:** Você não precisa (e nem deve) enviar um arquivo `.env` contendo a senha do seu banco de dados Supabase para os avaliadores. Isso é red flag em testes técnicos.
  3. **Isolamento:** O banco sobe do zero, limpo, garantindo que o ambiente do avaliador seja idêntico ao seu.
- **O Problema Atual:** Você testou o Supabase e populou os dados lá. O banco local do seu Docker (`catalog-db`) está VAZIO. Se você abrir a tela agora, o sistema não vai achar nenhum livro.

## Proposed Changes

### 1. Desconectar o Supabase
- Limpar a variável `DATABASE_URL` do seu arquivo `.env` para evitar confusões (ou comentá-la).
- Manter o `docker-compose.yml` **exatamente como está**. O hardcode `DATABASE_URL: postgresql://postgres:postgres@db:5432/catalog_db` está correto para forçar o container do backend a olhar para o container do banco.

### 2. Popular o Banco Local (Data Ingestion)
- Precisamos rodar o script de ingestão mirando no banco local do Docker para que ele crie os 20 livros e os embeddings no seu PostgreSQL local.

## Verification Plan
1. Rodar `docker-compose up -d`.
2. Executar o script de ingestão `python ai/ingest/ingest_books.py` de dentro do container do backend ou localmente exportando a URL local.
3. Testar a interface no `localhost:3000` e garantir que as buscas estão funcionando perfeitamente 100% offline (sem Supabase, batendo apenas na API do OpenRouter).
