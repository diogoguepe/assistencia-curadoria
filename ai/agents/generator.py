import logging
import json
from typing import List
from shared.models import Book
from ai.providers.base_provider import BaseAIProvider

logger = logging.getLogger("backend")

class GenerationAgent:
    """Agent responsible for writing the final response.
    Constructs a highly detailed, professional markdown recommendation based ONLY on the provided books.
    Strictly forbids hallucinating books, authors, or ISBNs.
    """

    def __init__(self, provider: BaseAIProvider):
        self.provider = provider

    async def generate_response(
        self,
        query: str,
        intent: str,
        books: List[Book]
    ) -> str:
        logger.info(f"Executing GenerationAgent (Intent={intent}, Books={len(books)})...")

        # Handle Out of Catalog intent
        if intent == "OUT_OF_CATALOG" or not books:
            logger.info("Handling out-of-catalog or empty books case.")
            system_instruction = (
                "Você é o Assistente de Curadoria do Catálogo da Editora Globo.\n"
                "Sua tarefa é responder de forma extremamente educada e profissional ao usuário, "
                "explicando de maneira amigável que a pergunta está fora do escopo ou que não temos livros "
                "no catálogo que atendam a essa solicitação específica.\n"
                "Oriente o usuário sobre os gêneros que possuímos (como Ficção Científica, Tecnologia, Infantil, "
                "Romances, Finanças Pessoais, Marketing e Ecologia Urbana).\n"
                "Não invente livros ou autores."
            )
            prompt = f"Pergunta fora de catálogo ou sem correspondência: \"{query}\""
            return await self.provider.generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.3
            )

        # Format book context for prompt
        books_context = []
        for b in books:
            books_context.append({
                "id": b.id,
                "title": b.title,
                "author": b.authors,
                "genre": b.genres,
                "targetAudience": b.target_audience,
                "publicationYear": b.publication_year,
                "synopsis": b.synopsis,
                "price": float(b.price) if b.price is not None else 0.0,
                "pages": b.pages,
                "isbn": b.isbn,
                "tags": b.tags,
                "marketingHooks": b.marketing_hooks
            })

        system_instruction = (
            "Você é um Product Designer & Curador Editorial Sênior da Editora.\n"
            "Sua principal tarefa é analisar a pergunta do usuário e redigir uma resposta de curadoria de altíssimo nível.\n\n"
            "Regras Estritas:\n"
            "1. Responda em português brasileiro usando markdown elegante (negritos, listas, títulos).\n"
            "2. Cite os livros recomendados SEMPRE usando colchetes com o ID correspondente ao longo do texto, como [1], [2], etc.\n"
            "3. NUNCA invente livros, autores, preços ou ISBNs. Use somente os dados exatos do catálogo fornecido.\n"
            "4. Explique detalhadamente por que cada livro recomendado se encaixa na pergunta do usuário.\n"
            "5. Apresente os ganchos comerciais de marketing ou de atendimento para as equipes internas promoverem as obras.\n"
            "6. Estruture a resposta com divisões claras: uma introdução, os destaques da curadoria e diretrizes comerciais finais."
        )

        prompt = (
            f"Pergunta do usuário interno: \"{query}\"\n\n"
            f"Livros disponíveis para a curadoria:\n"
            f"{json.dumps(books_context, ensure_ascii=False, indent=2)}"
        )

        response = await self.provider.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=0.3
        )
        
        return response
