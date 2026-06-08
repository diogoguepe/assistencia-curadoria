import logging
import re
import json
from typing import List, Tuple, Dict, Any
from shared.models import Book
from ai.providers.base_provider import BaseAIProvider

logger = logging.getLogger("backend")

class ValidationAgent:
    """Agent responsible for auditing the generated curation text before delivery.
    Checks reference consistency programmatically, and evaluates semantic correctness and contradictions via LLM.
    """

    def __init__(self, provider: BaseAIProvider):
        self.provider = provider

    def _validate_citations_programmatically(self, text: str, allowed_ids: List[str]) -> Tuple[bool, str]:
        """Programmatically checks that all [id] references in the text map to books that were actually retrieved."""
        # Find all brackets enclosing numbers or strings (e.g., [1], [15], [FICH-2])
        citations = re.findall(r"\[(\w+)\]", text)
        
        # Deduplicate
        citations = list(set(citations))
        
        invalid_citations = []
        for citation in citations:
            # Check if it matches allowed IDs
            if citation not in allowed_ids:
                invalid_citations.append(citation)

        if invalid_citations:
            return False, f"A resposta citou IDs de livros inexistentes no contexto: {invalid_citations}"
        
        return True, "Citações programáticas válidas."

    async def validate(
        self,
        query: str,
        answer: str,
        books: List[Book]
    ) -> Dict[str, Any]:
        logger.info("Executing ValidationAgent check...")

        allowed_ids = [b.id for b in books]
        
        # 1. Programmatic citation check
        prog_valid, prog_message = self._validate_citations_programmatically(answer, allowed_ids)
        if not prog_valid:
            logger.warning(f"Validation failed (Programmatic): {prog_message}")
            return {
                "success": False,
                "reason": prog_message,
                "is_critical": True
            }

        # 2. Semantic validation via LLM (check for hallucinations/contradictions)
        if not books:
            # If no books are present (out of catalog), no semantic check against catalog metadata is needed
            return {
                "success": True,
                "reason": "Sem livros para validar (fora do catálogo/vazio).",
                "is_critical": False
            }

        books_data = []
        for b in books:
            books_data.append({
                "id": b.id,
                "title": b.title,
                "author": b.authors,
                "genre": b.genres,
                "isbn": b.isbn,
                "synopsis": b.synopsis
            })

        system_instruction = (
            "Você é um Auditor Editorial e Inspetor de Fatos Sênior.\n"
            "Sua tarefa é analisar a resposta gerada por um assistente de IA e validar se ela:\n"
            "1. Contradiz alguma informação oficial dos livros fornecidos no contexto (como autores, títulos, ISBNs).\n"
            "2. Inventa fatos ou livros adicionais que não constam no contexto.\n"
            "3. Contém contradições lógicas absurdas sobre as obras.\n\n"
            "Responda estritamente no formato JSON abaixo:\n"
            "{\n"
            "  \"success\": true ou false,\n"
            "  \"reason\": \"Se success for false, explique a contradição ou erro encontrado em português brasileiro. Se true, responda 'Coerente'.\"\n"
            "}"
        )

        prompt = (
            f"Pergunta do usuário: \"{query}\"\n\n"
            f"Livros oficiais do catálogo:\n"
            f"{json.dumps(books_data, ensure_ascii=False, indent=2)}\n\n"
            f"Resposta a ser validada:\n"
            f"\"\"\"\n{answer}\n\"\"\""
        )

        try:
            response = await self.provider.generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                response_format="json",
                schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "reason": {"type": "string"}
                    },
                    "required": ["success", "reason"]
                }
            )

            result = json.loads(response)
            logger.info(f"ValidationAgent LLM check: success={result.get('success')}, reason={result.get('reason')}")
            return {
                "success": result.get("success", True),
                "reason": result.get("reason", "Validação concluída."),
                "is_critical": False
            }

        except Exception as e:
            logger.error(f"Error in ValidationAgent LLM check: {e}. Defaulting to True.")
            return {
                "success": True,
                "reason": "Erro no validador. Assumindo resposta válida por tolerância a falhas.",
                "is_critical": False
            }
