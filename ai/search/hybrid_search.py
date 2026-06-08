import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Tuple, Any

from shared.models import Book
from ai.search.rrf import reciprocal_rank_fusion
from ai.providers.base_provider import BaseAIProvider

logger = logging.getLogger("backend")

async def perform_hybrid_search(
    query: str,
    db: Session,
    provider: BaseAIProvider,
    limit: int = 20
) -> List[Book]:
    """Performs hybrid search (PostgreSQL FTS + pgvector Vector Search) and merges results via RRF.
    
    Returns:
        A list of Book objects representing the top consolidated search candidates.
    """
    logger.info(f"Initiating hybrid search for query: '{query}'")

    # 1. Pipeline A: Full Text Search (FTS) in PostgreSQL
    fts_results = []
    try:
        # Use plainto_tsquery for natural language search
        fts_results = db.query(Book).filter(
            text("fts_vector @@ plainto_tsquery('portuguese', :q)")
        ).params(q=query).order_by(
            text("ts_rank_cd(fts_vector, plainto_tsquery('portuguese', :q)) DESC")
        ).limit(limit).all()
        
        logger.info(f"FTS search returned {len(fts_results)} candidates.")
        
        # Fallback: if no FTS matches but we have alphanumeric query, try simple ILIKE matches
        if not fts_results:
            clean_query = "".join(c for c in query if c.isalnum() or c.isspace()).strip()
            words = [w for w in clean_query.split() if len(w) > 2]
            if words:
                conditions = " OR ".join([f"title ILIKE :w_{i} OR synopsis ILIKE :w_{i} OR authors ILIKE :w_{i}" for i in range(len(words))])
                params = {f"w_{i}": f"%{word}%" for i, word in enumerate(words)}
                fts_results = db.query(Book).filter(text(conditions)).params(**params).limit(limit).all()
                logger.info(f"FTS fallback (ILIKE) returned {len(fts_results)} candidates.")
                
    except Exception as e:
        logger.error(f"Error executing FTS query: {e}")

    # 2. Pipeline B: pgvector Similarity Search
    vector_results = []
    try:
        # Generate query embedding via provider
        logger.info("Generating embedding for the search query...")
        query_vector = await provider.generate_embedding(query)
        
        # Order by Cosine Distance
        vector_results = db.query(Book).order_by(
            Book.embedding.cosine_distance(query_vector)
        ).limit(limit).all()
        
        logger.info(f"Vector search returned {len(vector_results)} candidates.")
    except Exception as e:
        logger.error(f"Error executing pgvector search query: {e}")

    # 3. Apply Reciprocal Rank Fusion (RRF)
    if not fts_results and not vector_results:
        # If both pipelines failed or returned empty (e.g. fresh database), return all books as fallback
        logger.warning("Both retrieval pipelines returned empty. Falling back to returning all catalog books.")
        return db.query(Book).limit(limit).all()

    fused_results_with_scores = reciprocal_rank_fusion(
        fts_results=fts_results,
        vector_results=vector_results,
        k=60
    )

    # Extract the Book objects from fused tuples
    fused_books: List[Book] = [item for item, score in fused_results_with_scores]
    
    # Slice to top candidate limit
    final_candidates = fused_books[:limit]
    logger.info(f"Hybrid search consolidated {len(final_candidates)} candidates after RRF fusion.")
    
    return final_candidates
