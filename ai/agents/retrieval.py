import logging
from typing import List
from sqlalchemy.orm import Session

from shared.models import Book
from ai.providers.base_provider import BaseAIProvider
from ai.search.hybrid_search import perform_hybrid_search

logger = logging.getLogger("backend")

class RetrievalAgent:
    """Agent responsible for analyzing the query, refining keywords/search terms,
    and executing the parallel hybrid search (FTS + pgvector).
    """

    def __init__(self, provider: BaseAIProvider):
        self.provider = provider

    async def retrieve(self, query: str, db: Session) -> List[Book]:
        logger.info("Executing RetrievalAgent search optimization...")
        
        system_instruction = (
            "Você é um engenheiro de busca especializado em recuperação de informação.\n"
            "Sua tarefa é analisar a pergunta do usuário e extrair apenas os termos de busca fundamentais em português "
            "(palavras-chave, nomes de autores, gêneros ou conceitos importantes), removendo saudações ou palavras de ligação.\n"
            "Retorne apenas os termos separados por espaço em uma única linha. Exemplo:\n"
            "Entrada: 'Gostaria de ver se vocês têm livros sobre inteligência artificial lançados em 2025.'\n"
            "Saída: 'inteligência artificial 2025'"
        )

        optimized_query = query
        try:
            # Generate optimized query keywords
            response = await self.provider.generate_text(
                prompt=f"Texto do usuário: \"{query}\"",
                system_instruction=system_instruction,
                temperature=0.0,
                max_tokens=30
            )
            cleaned_response = response.strip()
            if cleaned_response:
                optimized_query = cleaned_response
                logger.info(f"RetrievalAgent: Query optimized from '{query}' to '{optimized_query}'")
        except Exception as e:
            logger.error(f"Error optimizing query in RetrievalAgent: {e}. Using original query.")

        # Execute hybrid search with the optimized query
        candidates = await perform_hybrid_search(
            query=optimized_query,
            db=db,
            provider=self.provider,
            limit=20
        )
        
        return candidates
