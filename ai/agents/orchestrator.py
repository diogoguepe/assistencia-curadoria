import logging
import time
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from shared.models import Book
from shared.schemas import AnswerResponse, PipelineStep, BookSchema
from ai.providers.openrouter_provider import OpenRouterAIProvider
from ai.agents.intent import IntentAgent
from ai.agents.retrieval import RetrievalAgent
from ai.agents.reranker import RerankerAgent
from ai.agents.generator import GenerationAgent
from ai.agents.validator import ValidationAgent

logger = logging.getLogger("backend")

class AgentOrchestrator:
    """Main Multi-Agent Orchestrator.
    Controls the flow of execution, monitors execution times, and aggregates results.
    """

    def __init__(self):
        # Instantiate provider and agents
        self.provider = OpenRouterAIProvider()
        self.intent_agent = IntentAgent(self.provider)
        self.retrieval_agent = RetrievalAgent(self.provider)
        self.reranker_agent = RerankerAgent(self.provider)
        self.generation_agent = GenerationAgent(self.provider)
        self.validation_agent = ValidationAgent(self.provider)

    async def run_curation(self, question: str, db: Session) -> AnswerResponse:
        start_time = time.time()
        pipeline_steps: List[PipelineStep] = []
        
        # --- STEP 1: Intent Classification ---
        step1_start = time.time()
        intent_result = await self.intent_agent.classify(question)
        intent = intent_result.get("intent", "RECOMMENDATION")
        explanation = intent_result.get("explanation", "")
        step1_duration = int((time.time() - step1_start) * 1000)
        
        pipeline_steps.append(PipelineStep(
            title="Pergunta Recebida",
            status="completed",
            description="Análise linguística e classificação da intenção do usuário.",
            details=f"Intenção detectada: {intent}\nJustificativa: {explanation}",
            durationMs=step1_duration
        ))

        # Initialize catalog list for the steps
        final_books: List[Book] = []
        
        # If the query is OUT_OF_CATALOG, we skip search and reranking
        if intent == "OUT_OF_CATALOG":
            # --- STEP 3 (skip search/rerank): Generation ---
            step3_start = time.time()
            answer = await self.generation_agent.generate_response(
                query=question,
                intent=intent,
                books=[]
            )
            step3_duration = int((time.time() - step3_start) * 1000)
            
            pipeline_steps.append(PipelineStep(
                title="Curadoria de Inteligência",
                status="completed",
                description="Resposta direta gerada por estar fora do escopo do catálogo.",
                details="Solicitação identificada como fora de catálogo. Nenhuma busca no banco executada.",
                durationMs=step3_duration
            ))
            
            # --- STEP 4: Montagem ---
            pipeline_steps.append(PipelineStep(
                title="Montagem da Resposta",
                status="completed",
                description="Validação e empacotamento concluídos.",
                details="Criação de resposta informativa educada para pergunta fora de escopo.",
                durationMs=5
            ))
            
            total_duration = int((time.time() - start_time) * 1000)
            return AnswerResponse(
                answer=answer,
                references=[],
                pipeline=pipeline_steps,
                responseTimeMs=total_duration,
                booksCount=0
            )

        # --- STEP 2: Retrieval ---
        step2_start = time.time()
        candidates = await self.retrieval_agent.retrieve(question, db)
        step2_duration = int((time.time() - step2_start) * 1000)
        
        pipeline_steps.append(PipelineStep(
            title="Busca de Candidatos",
            status="completed",
            description=f"Buscador híbrido (FTS + pgvector) retornou {len(candidates)} livros candidatos.",
            details=f"Candidatos brutos recuperados no acervo: {', '.join([b.title for b in candidates]) if candidates else 'Nenhum'}",
            durationMs=step2_duration
        ))

        # --- STEP 3: Reranking & Generation with validation loop ---
        step3_start = time.time()
        
        # Rerank to top 5
        ranked_books = await self.reranker_agent.rerank(question, candidates)
        final_books = ranked_books
        
        # Generation and Validation retry loop (Up to 2 retries)
        max_retries = 2
        retry_count = 0
        answer = ""
        validation_passed = False
        validation_error_msg = ""
        
        while retry_count <= max_retries and not validation_passed:
            if retry_count > 0:
                logger.warning(f"Regenerating response. Retry {retry_count}/{max_retries}. Error: {validation_error_msg}")
                # Adjust prompt/query to include the feedback
                regeneration_query = (
                    f"{question}\n\n[ATENÇÃO: A geração anterior falhou na validação com o erro: '{validation_error_msg}'. "
                    f"Corrija os IDs das citações ou fatos e certifique-se de citar estritamente apenas "
                    f"os livros fornecidos no contexto]"
                )
            else:
                regeneration_query = question

            answer = await self.generation_agent.generate_response(
                query=regeneration_query,
                intent=intent,
                books=final_books
            )
            
            # Audit answer
            validation_result = await self.validation_agent.validate(question, answer, final_books)
            validation_passed = validation_result.get("success", True)
            validation_error_msg = validation_result.get("reason", "")
            
            if not validation_passed:
                retry_count += 1
            else:
                break
                
        step3_duration = int((time.time() - step3_start) * 1000)
        
        pipeline_steps.append(PipelineStep(
            title="Curadoria de Inteligência",
            status="completed" if validation_passed else "error",
            description="Análise cognitiva profunda e contextualização pelo LLM executadas.",
            details=(
                f"Livros selecionados: {', '.join([b.title for b in final_books])}\n"
                f"Validação: {'Sucesso' if validation_passed else 'Falhou - ' + validation_error_msg}"
            ),
            durationMs=step3_duration
        ))

        # --- STEP 4: Montagem da Resposta ---
        step4_start = time.time()
        
        # Convert DB models to Pydantic schemas for response
        references_schema = [BookSchema.model_validate(b.to_dict()) for b in final_books]
        
        step4_duration = int((time.time() - step4_start) * 1000)
        pipeline_steps.append(PipelineStep(
            title="Montagem da Resposta",
            status="completed",
            description="Empacotamento de referências estruturadas e latência concluído.",
            details=f"Curadoria consolidada com {len(references_schema)} livros oficiais como fontes.",
            durationMs=step4_duration
        ))

        # Total timing
        total_duration = int((time.time() - start_time) * 1000)
        
        return AnswerResponse(
            answer=answer,
            references=references_schema,
            pipeline=pipeline_steps,
            responseTimeMs=total_duration,
            booksCount=len(references_schema)
        )

    async def run_curation_stream(self, question: str, db: Session):
        """Async generator that yields pipeline steps as they occur, followed by the final result.
        This enables SSE (Server-Sent Events) for real-time traceability, without breaking the Validation Agent.
        """
        start_time = time.time()
        
        # --- STEP 1: Intent Classification ---
        step1_start = time.time()
        intent_result = await self.intent_agent.classify(question)
        intent = intent_result.get("intent", "RECOMMENDATION")
        explanation = intent_result.get("explanation", "")
        step1_duration = int((time.time() - step1_start) * 1000)
        
        step1 = {
            "title": "Pergunta Recebida",
            "status": "completed",
            "description": "Análise linguística e classificação da intenção do usuário.",
            "details": f"Intenção detectada: {intent}\nJustificativa: {explanation}",
            "durationMs": step1_duration
        }
        yield {"type": "step", "data": step1}

        final_books: List[Book] = []
        
        if intent == "OUT_OF_CATALOG":
            step3_start = time.time()
            answer = await self.generation_agent.generate_response(query=question, intent=intent, books=[])
            step3_duration = int((time.time() - step3_start) * 1000)
            
            step3 = {
                "title": "Curadoria de Inteligência",
                "status": "completed",
                "description": "Resposta direta gerada por estar fora do escopo do catálogo.",
                "details": "Solicitação identificada como fora de catálogo. Nenhuma busca no banco executada.",
                "durationMs": step3_duration
            }
            yield {"type": "step", "data": step3}
            
            step4 = {
                "title": "Montagem da Resposta",
                "status": "completed",
                "description": "Validação e empacotamento concluídos.",
                "details": "Criação de resposta informativa educada para pergunta fora de escopo.",
                "durationMs": 5
            }
            yield {"type": "step", "data": step4}
            
            total_duration = int((time.time() - start_time) * 1000)
            yield {"type": "result", "data": {
                "answer": answer,
                "references": [],
                "responseTimeMs": total_duration,
                "booksCount": 0
            }}
            return

        # --- STEP 2: Retrieval ---
        step2_start = time.time()
        candidates = await self.retrieval_agent.retrieve(question, db)
        step2_duration = int((time.time() - step2_start) * 1000)
        
        step2 = {
            "title": "Busca de Candidatos",
            "status": "completed",
            "description": f"Buscador híbrido (FTS + pgvector) retornou {len(candidates)} livros candidatos.",
            "details": f"Candidatos brutos recuperados no acervo: {', '.join([b.title for b in candidates]) if candidates else 'Nenhum'}",
            "durationMs": step2_duration
        }
        yield {"type": "step", "data": step2}

        # --- STEP 3: Reranking & Generation with validation loop ---
        step3_start = time.time()
        ranked_books = await self.reranker_agent.rerank(question, candidates)
        final_books = ranked_books
        
        max_retries = 2
        retry_count = 0
        answer = ""
        validation_passed = False
        validation_error_msg = ""
        
        while retry_count <= max_retries and not validation_passed:
            regeneration_query = question
            if retry_count > 0:
                logger.warning(f"Regenerating response. Retry {retry_count}/{max_retries}. Error: {validation_error_msg}")
                regeneration_query = (
                    f"{question}\n\n[ATENÇÃO: A geração anterior falhou na validação com o erro: '{validation_error_msg}'. "
                    f"Corrija os IDs das citações ou fatos e certifique-se de citar estritamente apenas "
                    f"os livros fornecidos no contexto]"
                )

            answer = await self.generation_agent.generate_response(query=regeneration_query, intent=intent, books=final_books)
            validation_result = await self.validation_agent.validate(question, answer, final_books)
            validation_passed = validation_result.get("success", True)
            validation_error_msg = validation_result.get("reason", "")
            
            if not validation_passed:
                retry_count += 1
            else:
                break
                
        step3_duration = int((time.time() - step3_start) * 1000)
        step3 = {
            "title": "Curadoria de Inteligência",
            "status": "completed" if validation_passed else "error",
            "description": "Análise cognitiva profunda e contextualização pelo LLM executadas.",
            "details": f"Livros selecionados: {', '.join([b.title for b in final_books])}\nValidação: {'Sucesso' if validation_passed else 'Falhou - ' + validation_error_msg}",
            "durationMs": step3_duration
        }
        yield {"type": "step", "data": step3}

        # --- STEP 4: Montagem da Resposta ---
        step4_start = time.time()
        references_schema = [BookSchema.model_validate(b.to_dict()).model_dump() for b in final_books]
        step4_duration = int((time.time() - step4_start) * 1000)
        
        step4 = {
            "title": "Montagem da Resposta",
            "status": "completed",
            "description": "Empacotamento de referências estruturadas e latência concluído.",
            "details": f"Curadoria consolidada com {len(references_schema)} livros oficiais como fontes.",
            "durationMs": step4_duration
        }
        yield {"type": "step", "data": step4}

        total_duration = int((time.time() - start_time) * 1000)
        
        yield {"type": "result", "data": {
            "answer": answer,
            "references": references_schema,
            "responseTimeMs": total_duration,
            "booksCount": len(references_schema)
        }}
