import time
import uuid
import logging
import json
from typing import Dict, Any, AsyncGenerator
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.db_init import init_database
from shared.schemas import AskRequest, AnswerResponse, FeedbackRequest
from shared.models import Feedback, QueryLog
from ai.agents.orchestrator import AgentOrchestrator

# Configure structured logging format
logging.basicConfig(
    level=logging.getLevelName(settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] [ReqID: %(request_id)s] [CorrID: %(correlation_id)s] %(name)s - %(message)s"
)
logger = logging.getLogger("backend")

# Local logger filter to inject correlation and request IDs dynamically
class ContextFilter(logging.Filter):
    def filter(self, record):
        record.request_id = getattr(record, 'request_id', 'N/A')
        record.correlation_id = getattr(record, 'correlation_id', 'N/A')
        return True

# Apply filter to root logger handlers
for handler in logging.root.handlers:
    handler.addFilter(ContextFilter())

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend API for the Catalog Curatorship Assistant"
)

# CORS Middleware to support frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Telemetry/Metrics Store (InMemory for GET /metrics)
METRICS = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "total_latency_ms": 0.0,
    "agent_metrics": {
        "IntentAgent": {"calls": 0, "total_time_ms": 0.0},
        "RetrievalAgent": {"calls": 0, "total_time_ms": 0.0},
        "RerankerAgent": {"calls": 0, "total_time_ms": 0.0},
        "GenerationAgent": {"calls": 0, "total_time_ms": 0.0},
        "ValidationAgent": {"calls": 0, "total_time_ms": 0.0}
    }
}

# --- MIDDLEWARES ---

@app.middleware("http")
async def context_and_telemetry_middleware(request: Request, call_next):
    # Extract or generate Request ID and Correlation ID
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    
    # Store IDs in task local context (using logger extra dictionary)
    # This ensures log lines print the context
    context_extra = {"request_id": request_id, "correlation_id": correlation_id}
    
    # Set request-scoped attributes
    request.state.request_id = request_id
    request.state.correlation_id = correlation_id
    
    start_time = time.time()
    
    # Bind headers to the response
    logger.info(f"Received request: {request.method} {request.url.path}", extra=context_extra)
    
    # Handle response
    try:
        response: Response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        
        # Log details
        logger.info(
            f"Completed request: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - Duration: {duration_ms:.2f}ms",
            extra=context_extra
        )
        
        # Update telemetry
        if request.url.path in ("/api/ask", "/ask") and request.method == "POST":
            METRICS["total_requests"] += 1
            METRICS["total_latency_ms"] += duration_ms
            if response.status_code == 200:
                METRICS["successful_requests"] += 1
            else:
                METRICS["failed_requests"] += 1
                
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"Request failed: {e} - Duration: {duration_ms:.2f}ms", exc_info=True, extra=context_extra)
        
        if request.url.path in ("/api/ask", "/ask") and request.method == "POST":
            METRICS["total_requests"] += 1
            METRICS["failed_requests"] += 1
            METRICS["total_latency_ms"] += duration_ms
            
        # Standard error response
        return Response(
            content=json.dumps({
                "error": "Internal Server Error",
                "message": str(e),
                "correlationId": correlation_id
            }),
            status_code=500,
            media_type="application/json"
        )

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    logger.info("Initializing database and checking schemas...", extra={"request_id": "startup", "correlation_id": "startup"})
    try:
        init_database()
        logger.info("Database initialized successfully during startup.", extra={"request_id": "startup", "correlation_id": "startup"})
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}", extra={"request_id": "startup", "correlation_id": "startup"})

# --- ROUTES ---

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to monitor database connectivity and catalog size."""
    try:
        # Test DB connection
        db.execute(text("SELECT 1;"))
        
        # Get catalog size
        catalog_size = db.execute(text("SELECT COUNT(*) FROM books;")).scalar()
        
        return {
            "status": "ok",
            "database": "connected",
            "catalogSize": catalog_size
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}", extra={"request_id": "health", "correlation_id": "health"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: Database unreachable. Details: {str(e)}"
        )

@app.get("/metrics")
def get_metrics():
    """Metrics endpoint returning system performance, latency, and agent-level statistics."""
    avg_latency = (
        METRICS["total_latency_ms"] / METRICS["total_requests"]
        if METRICS["total_requests"] > 0
        else 0.0
    )
    
    return {
        "requests": {
            "total": METRICS["total_requests"],
            "success": METRICS["successful_requests"],
            "failed": METRICS["failed_requests"],
            "successRate": (
                (METRICS["successful_requests"] / METRICS["total_requests"]) * 100
                if METRICS["total_requests"] > 0
                else 100.0
            )
        },
        "performance": {
            "averageLatencyMs": round(avg_latency, 2),
            "totalLatencyMs": round(METRICS["total_latency_ms"], 2)
        },
        "agents": METRICS["agent_metrics"]
    }

@app.post("/api/ask", response_model=AnswerResponse)
@app.post("/ask", response_model=AnswerResponse)
async def ask_curator(
    payload: AskRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Main endpoint to ask the Multi-Agent curator about books in the catalog."""
    req_id = request.state.request_id
    corr_id = request.state.correlation_id
    context_extra = {"request_id": req_id, "correlation_id": corr_id}
    
    logger.info(f"Asking curator: {payload.question}", extra=context_extra)
    
    orchestrator = AgentOrchestrator()
    
    try:
        # Run AI Multi-Agent orchestration
        start_time = time.time()
        result: AnswerResponse = await orchestrator.run_curation(payload.question, db)
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Update individual agent telemetries from pipeline steps
        for step in result.pipeline:
            # Match step title to agent telemetry keys
            title_to_agent = {
                "Pergunta Recebida": "IntentAgent",
                "Busca de Candidatos": "RetrievalAgent",
                "Curadoria de Inteligência": "GenerationAgent"
            }
            agent_key = title_to_agent.get(step.title)
            if agent_key and step.durationMs:
                METRICS["agent_metrics"][agent_key]["calls"] += 1
                METRICS["agent_metrics"][agent_key]["total_time_ms"] += step.durationMs
        
        # Log to Database for query audit / observability
        # Deduce intent from pipeline steps
        detected_intent = "UNKNOWN"
        for step in result.pipeline:
            if step.title == "Pergunta Recebida" and step.details:
                for line in step.details.split("\n"):
                    if "Intenção detectada:" in line:
                        detected_intent = line.split("Intenção detectada:")[1].strip()[:50]
        
        query_log = QueryLog(
            request_id=corr_id,
            question=payload.question,
            intent=detected_intent,
            answer=result.answer,
            response_time_ms=result.responseTimeMs,
            books_count=result.booksCount
        )
        db.add(query_log)
        db.commit()
        
        return result
        
    except Exception as e:
        logger.error(f"Error in ask_curator: {e}", exc_info=True, extra=context_extra)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar a pergunta pela camada de inteligência: {str(e)}"
        )

@app.post("/api/ask/stream")
@app.post("/ask/stream")
async def ask_curator_stream(
    payload: AskRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Streaming endpoint for Multi-Agent curation (SSE)."""
    req_id = request.state.request_id
    corr_id = request.state.correlation_id
    context_extra = {"request_id": req_id, "correlation_id": corr_id}
    
    logger.info(f"Asking curator (stream): {payload.question}", extra=context_extra)
    
    orchestrator = AgentOrchestrator()
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            detected_intent = "UNKNOWN"
            answer_result = None
            
            async for event in orchestrator.run_curation_stream(payload.question, db):
                # Update metrics if it's a step
                if event["type"] == "step":
                    step = event["data"]
                    title_to_agent = {
                        "Pergunta Recebida": "IntentAgent",
                        "Busca de Candidatos": "RetrievalAgent",
                        "Curadoria de Inteligência": "GenerationAgent"
                    }
                    agent_key = title_to_agent.get(step.get("title"))
                    if agent_key and step.get("durationMs"):
                        METRICS["agent_metrics"][agent_key]["calls"] += 1
                        METRICS["agent_metrics"][agent_key]["total_time_ms"] += step["durationMs"]
                        
                    if step.get("title") == "Pergunta Recebida" and step.get("details"):
                        for line in step["details"].split("\n"):
                            if "Intenção detectada:" in line:
                                detected_intent = line.split("Intenção detectada:")[1].strip()[:50]
                               
                if event["type"] == "result":
                    answer_result = event["data"]
                    
                # Format as Server-Sent Event
                yield f"data: {json.dumps(event)}\\n\\n"
                
            # Log to Database after streaming is complete
            if answer_result:
                query_log = QueryLog(
                    request_id=corr_id,
                    question=payload.question,
                    intent=detected_intent,
                    answer=answer_result.get("answer", ""),
                    response_time_ms=answer_result.get("responseTimeMs", 0),
                    books_count=answer_result.get("booksCount", 0)
                )
                db.add(query_log)
                db.commit()
                
        except Exception as e:
            logger.error(f"Error in ask_curator_stream: {e}", exc_info=True, extra=context_extra)
            yield f"event: error\\ndata: {json.dumps({'detail': str(e)})}\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/feedback")
@app.post("/feedback")
def submit_feedback(
    payload: FeedbackRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Logs user feedback (rating and comments) associated with a previous curation request ID."""
    req_id = request.state.request_id
    corr_id = request.state.correlation_id
    context_extra = {"request_id": req_id, "correlation_id": corr_id}
    
    logger.info(f"Feedback received for ReqId {payload.requestId}: Rating={payload.rating}", extra=context_extra)
    
    try:
        # Find corresponding query text if exists in logs
        query_log = db.query(QueryLog).filter(QueryLog.request_id == payload.requestId).first()
        question_text = query_log.question if query_log else None
        
        feedback = Feedback(
            request_id=payload.requestId,
            question=question_text,
            rating=payload.rating,
            comment=payload.comment
        )
        db.add(feedback)
        db.commit()
        
        return {
            "status": "success",
            "message": "Feedback gravado com sucesso."
        }
    except Exception as e:
        logger.error(f"Failed to save feedback: {e}", exc_info=True, extra=context_extra)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar feedback no banco de dados: {str(e)}"
        )
