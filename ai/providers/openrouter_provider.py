import logging
import json
from typing import List, Optional, Any, Literal
import httpx

from ai.providers.base_provider import BaseAIProvider
from backend.app.config import settings

logger = logging.getLogger("backend")

class OpenRouterAIProvider(BaseAIProvider):
    """Concrete implementation of BaseAIProvider targeting the OpenRouter API.
    Handles HTTP communication, custom headers, timeouts, and error scenarios.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip('/')
        self.headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/diogoguedes/editora-globo",
            "X-Title": settings.APP_NAME
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
        self.timeout = settings.LLM_TIMEOUT

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_format: Optional[Literal["json", "text"]] = "text",
        schema: Optional[Any] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None
    ) -> str:
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY não está configurada no .env. Adicione a chave para executar chamadas de IA.")
        url = f"{self.base_url}/chat/completions"
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.GENERATION_MODEL,
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        # If structured output is requested
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        logger.debug(f"Calling OpenRouter chat/completions with model: {settings.GENERATION_MODEL}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=self.timeout
                )
                
                # Check for HTTP errors
                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("error", {}).get("message", error_detail)
                    except Exception:
                        pass
                    raise httpx.HTTPStatusError(
                        f"OpenRouter API error (HTTP {response.status_code}): {error_detail}",
                        request=response.request,
                        response=response
                    )
                
                res_data = response.json()
                choices = res_data.get("choices", [])
                if not choices:
                    raise ValueError("Empty response choices returned by OpenRouter API.")
                
                content = choices[0].get("message", {}).get("content", "")
                return content.strip()
                
            except httpx.TimeoutException as te:
                logger.error(f"Timeout calling OpenRouter API text generation: {te}")
                raise TimeoutError("O servidor de inteligência artificial demorou muito para responder. Tente novamente.")
            except Exception as e:
                logger.error(f"Error in OpenRouter generate_text: {e}")
                raise e

    async def generate_embedding(self, text: str) -> List[float]:
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY não está configurada no .env. Adicione a chave para gerar embeddings.")
        url = f"{self.base_url}/embeddings"
        
        payload = {
            "model": settings.EMBEDDING_MODEL,
            "input": text
        }

        logger.debug(f"Calling OpenRouter embeddings with model: {settings.EMBEDDING_MODEL}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=self.timeout
                )

                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("error", {}).get("message", error_detail)
                    except Exception:
                        pass
                    raise httpx.HTTPStatusError(
                        f"OpenRouter Embeddings error (HTTP {response.status_code}): {error_detail}",
                        request=response.request,
                        response=response
                    )

                res_data = response.json()
                data_list = res_data.get("data", [])
                if not data_list:
                    raise ValueError("Empty embedding vector returned by OpenRouter API.")

                embedding = data_list[0].get("embedding", [])
                return embedding

            except httpx.TimeoutException as te:
                logger.error(f"Timeout calling OpenRouter API embeddings: {te}")
                raise TimeoutError("O servidor de embeddings demorou muito para responder. Tente novamente.")
            except Exception as e:
                logger.error(f"Error in OpenRouter generate_embedding: {e}")
                raise e
