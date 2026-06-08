import logging
import json
from typing import List, Dict, Any
from shared.models import Book
from ai.providers.base_provider import BaseAIProvider

logger = logging.getLogger("backend")

class RerankerAgent:
    """Agent responsible for selecting and ranking the Top 5 most relevant books 
    from the Top 20 candidates returned by the hybrid search.
    """

    def __init__(self, provider: BaseAIProvider):
        self.provider = provider

    async def rerank(self, query: str, candidates: List[Book]) -> List[Book]:
        if not candidates:
            logger.warning("No candidates supplied to RerankerAgent. Returning empty list.")
            return []

        logger.info(f"Executing RerankerAgent for {len(candidates)} candidates...")

        # 1. Format candidate list for prompt context
        candidates_data = []
        for b in candidates:
            candidates_data.append({
                "id": b.id,
                "title": b.title,
                "author": b.authors,
                "genre": b.genres,
                "targetAudience": b.target_audience,
                "synopsis": b.synopsis,
                "tags": b.tags
            })

        system_instruction = (
            "Você é um classificador sênior e avaliador de relevância literária.\n"
            "Sua tarefa é analisar a pergunta do usuário e uma lista de livros candidatos, "
            "selecionando os mais relevantes em ordem decrescente de relevância.\n"
            "Você deve selecionar no máximo os 5 melhores livros que REALMENTE respondem ou se relacionam com a pergunta.\n"
            "Retorne a resposta estritamente no formato JSON abaixo:\n"
            "{\n"
            "  \"ranked_ids\": [\"id_1\", \"id_2\", ...]\n"
            "}\n"
            "Não invente IDs que não estejam na lista de entrada. Se nenhum livro for relevante, retorne uma lista vazia."
        )

        prompt = (
            f"Pergunta do usuário: \"{query}\"\n\n"
            f"Livros Candidatos:\n"
            f"{json.dumps(candidates_data, ensure_ascii=False, indent=2)}"
        )

        try:
            response = await self.provider.generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                response_format="json",
                schema={
                    "type": "object",
                    "properties": {
                        "ranked_ids": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["ranked_ids"]
                }
            )

            result = json.loads(response)
            ranked_ids = result.get("ranked_ids", [])
            logger.info(f"RerankerAgent selected IDs: {ranked_ids}")

            # 2. Reorder the original Book objects according to the ranked IDs
            # Map for quick lookup
            candidates_map = {b.id: b for b in candidates}
            ranked_books = []
            for bid in ranked_ids:
                bid_str = str(bid)
                if bid_str in candidates_map:
                    ranked_books.append(candidates_map[bid_str])

            # In case the LLM returned nothing or invalid IDs, fallback to the top 5 candidates from RRF
            if not ranked_books:
                logger.warning("Reranker returned no valid IDs. Falling back to top 5 candidates from search.")
                return candidates[:5]

            return ranked_books

        except Exception as e:
            logger.error(f"Error in RerankerAgent: {e}. Falling back to top 5 search candidates.")
            return candidates[:5]
