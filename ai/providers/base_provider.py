from abc import ABC, abstractmethod
from typing import List, Optional, Any, Literal

class BaseAIProvider(ABC):
    """Abstract interface defining required AI capabilities for text generation and embeddings.
    Allows changing LLM providers (e.g., OpenRouter, direct OpenAI, Google Vertex)
    without modifying agent core logic.
    """

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_format: Optional[Literal["json", "text"]] = "text",
        schema: Optional[Any] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generates a text completion based on a prompt and optional system instructions.
        Supports structured JSON output and schema validation where applicable.
        """
        pass

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Generates a vector embedding representation for the given text document."""
        pass
