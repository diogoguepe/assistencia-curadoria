import logging
import json
from typing import Dict, Any
from ai.providers.base_provider import BaseAIProvider

logger = logging.getLogger("backend")

class IntentAgent:
    """Agent responsible for classifying the user's intent to optimize down-the-line agents.
    Classifications: RECOMMENDATION, FILTER, COMPARISON, AUTHOR_SEARCH, CATALOG_LOOKUP, OUT_OF_CATALOG
    """

    def __init__(self, provider: BaseAIProvider):
        self.provider = provider

    async def classify(self, query: str) -> Dict[str, Any]:
        system_instruction = (
            "Você é um classificador de intenção linguística especialista em catálogo editorial.\n"
            "Sua tarefa é analisar a pergunta do usuário e classificá-la estritamente em uma das seguintes categorias:\n\n"
            "1. RECOMMENDATION: Solicitações de recomendações subjetivas baseadas em gostos, interesses ou temas (ex: 'me indique um romance para ler no outono', 'livros sobre amor').\n"
            "2. FILTER: Filtros diretos por critérios específicos como faixa etária, preço, páginas ou ano (ex: 'livros infantis de 3 a 5 anos', 'livros publicados em 2025').\n"
            "3. COMPARISON: Comparação explícita entre dois ou mais livros do acervo (ex: 'qual a diferença entre O Algoritmo da Emoção e Machine Learning Prático?').\n"
            "4. AUTHOR_SEARCH: Busca de livros de um autor específico por nome (ex: 'quais livros a Sofia Mendes escreveu?').\n"
            "5. CATALOG_LOOKUP: Busca por termos diretos ou confirmação de existência de um título ou ISBN específico (ex: 'vocês têm o livro Pipoca, o Coelho?').\n"
            "6. OUT_OF_CATALOG: Perguntas totalmente irrelevantes ou fora do escopo do catálogo editorial da editora (ex: 'como fazer receita de bolo de cenoura?', 'quem ganhou a copa de 1970?').\n\n"
            "Você DEVE responder estritamente em formato JSON válido contendo as seguintes chaves:\n"
            "- 'intent': Uma das strings em maiúsculo descritas acima.\n"
            "- 'explanation': Uma breve justificativa em português explicando a classificação."
        )

        prompt = f"Pergunta do usuário: \"{query}\""

        try:
            logger.info("Executing IntentAgent classification...")
            response = await self.provider.generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                response_format="json",
                schema={
                    "type": "object",
                    "properties": {
                        "intent": {"type": "string", "enum": ["RECOMMENDATION", "FILTER", "COMPARISON", "AUTHOR_SEARCH", "CATALOG_LOOKUP", "OUT_OF_CATALOG"]},
                        "explanation": {"type": "string"}
                    },
                    "required": ["intent", "explanation"]
                }
            )

            result = json.loads(response)
            logger.info(f"IntentAgent Result: Intent={result.get('intent')}, Explanation={result.get('explanation')}")
            return result
        except Exception as e:
            logger.error(f"Error in IntentAgent: {e}. Defaulting to RECOMMENDATION.")
            return {
                "intent": "RECOMMENDATION",
                "explanation": "Falha na classificação automática. Assumindo intenção geral de curadoria."
            }
        
if __name__ == "__main__":
    import asyncio
    from ai.providers.openrouter_provider import OpenRouterAIProvider
    
    async def test():
        p = OpenRouterAIProvider()
        agent = IntentAgent(p)
        print(await agent.classify("Me recomende um livro infantil legal"))
        
    asyncio.run(test())
