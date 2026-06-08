import os
import json
import logging
import asyncio
import time
import pandas as pd
from typing import List
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from ai.providers.openrouter_provider import OpenRouterAIProvider
from ai.agents.orchestrator import AgentOrchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluator")

class LLMAsJudge:
    """Invokes the LLM to rate the generated curation answer on quality, correctness,
    and compliance (avoiding hallucinations/contradictions).
    """

    def __init__(self, provider: OpenRouterAIProvider):
        self.provider = provider

    async def evaluate_answer(self, query: str, answer: str, referenced_books: List[dict]) -> dict:
        system_instruction = (
            "Você é um Juiz de Avaliação de IA Editorial independente.\n"
            "Sua tarefa é classificar a resposta gerada por um assistente de IA em uma escala de 1 a 5 (onde 1 é péssimo e 5 é perfeito).\n"
            "Critérios de avaliação:\n"
            "1. Coerência: A resposta é fluida, profissional e faz sentido?\n"
            "2. Grounding (Sem Alucinação): A resposta fala apenas sobre os livros do catálogo fornecidos no contexto? "
            "Se inventar livros ou detalhes não fornecidos, a nota deve ser no máximo 2.\n"
            "3. Utilidade: A resposta realmente ajuda o setor interno (Marketing, Comercial) com ganchos úteis?\n\n"
            "Você DEVE responder estritamente no formato JSON abaixo:\n"
            "{\n"
            "  \"score\": 1 a 5,\n"
            "  \"justification\": \"Sua justificativa sucinta em português brasileiro.\"\n"
            "}"
        )

        prompt = (
            f"Pergunta do usuário: \"{query}\"\n\n"
            f"Livros oficiais do catálogo fornecidos como contexto:\n"
            f"{json.dumps(referenced_books, ensure_ascii=False, indent=2)}\n\n"
            f"Resposta gerada pela IA:\n"
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
                        "score": {"type": "integer", "minimum": 1, "maximum": 5},
                        "justification": {"type": "string"}
                    },
                    "required": ["score", "justification"]
                }
            )
            return json.loads(response)
        except Exception as e:
            logger.error(f"Error calling LLM-as-Judge: {e}")
            return {"score": 3, "justification": f"Erro ao executar avaliação do juiz: {e}"}

async def run_evaluation():
    logger.info("Starting evaluation pipeline...")
    
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    questions_path = os.path.join(base_dir, "ai", "evaluation", "questions.txt")
    results_path = os.path.join(base_dir, "ai", "evaluation", "results.csv")

    if not os.path.exists(questions_path):
        logger.error(f"Questions file not found at: {questions_path}")
        return

    # Initialize components
    orchestrator = AgentOrchestrator()
    judge = LLMAsJudge(orchestrator.provider)
    db: Session = SessionLocal()

    eval_results = []

    try:
        with open(questions_path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]

        logger.info(f"Loaded {len(lines)} evaluation queries.")

        for idx, line in enumerate(lines, 1):
            if ";" not in line:
                logger.warning(f"Invalid format in questions.txt at line {idx}: {line}")
                continue
                
            parts = line.split(";")
            question = parts[0].strip()
            expected_ids_str = parts[1].strip()
            expected_ids = [eid.strip() for eid in expected_ids_str.split(",") if eid.strip()]
            
            logger.info(f"[{idx}/{len(lines)}] Evaluating query: '{question}'...")
            
            # Start timer
            start_time = time.time()
            try:
                # Execute orchestration
                response = await orchestrator.run_curation(question, db)
                duration_ms = response.responseTimeMs
                
                retrieved_ids = [ref.id for ref in response.references]
                
                # Calculate Precision and Recall
                intersection = set(retrieved_ids) & set(expected_ids)
                
                # Recall@K
                if expected_ids:
                    recall = len(intersection) / len(expected_ids)
                else:
                    # If out of catalog or no relevant books expected
                    recall = 1.0 if not retrieved_ids else 0.0
                    
                # Precision@K
                if retrieved_ids:
                    precision = len(intersection) / len(retrieved_ids)
                else:
                    precision = 1.0 if not expected_ids else 0.0

                # Run LLM-as-Judge
                # Format book details for the judge
                referenced_books_dict = [b.model_dump() for b in response.references]
                judge_result = await judge.evaluate_answer(question, response.answer, referenced_books_dict)
                judge_score = judge_result.get("score", 0)
                judge_reason = judge_result.get("justification", "")
                
                logger.info(
                    f"Result: Recall={recall:.2f}, Precision={precision:.2f}, "
                    f"Judge Score={judge_score}/5, Timing={duration_ms}ms"
                )

                eval_results.append({
                    "Question": question,
                    "ExpectedIDs": ",".join(expected_ids),
                    "RetrievedIDs": ",".join(retrieved_ids),
                    "Recall@5": round(recall, 2),
                    "Precision@5": round(precision, 2),
                    "LLM-as-Judge Score": judge_score,
                    "LLM-as-Judge Justification": judge_reason,
                    "ResponseTimeMs": duration_ms,
                    "Success": True,
                    "Error": ""
                })

            except Exception as e:
                logger.error(f"Failed to evaluate query '{question}': {e}")
                eval_results.append({
                    "Question": question,
                    "ExpectedIDs": ",".join(expected_ids),
                    "RetrievedIDs": "",
                    "Recall@5": 0.0,
                    "Precision@5": 0.0,
                    "LLM-as-Judge Score": 0,
                    "LLM-as-Judge Justification": "",
                    "ResponseTimeMs": int((time.time() - start_time) * 1000),
                    "Success": False,
                    "Error": str(e)
                })

        # Save to CSV using pandas
        df = pd.DataFrame(eval_results)
        df.to_csv(results_path, index=False, encoding='utf-8')
        logger.info(f"Evaluation report successfully saved to: {results_path}")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_evaluation())
