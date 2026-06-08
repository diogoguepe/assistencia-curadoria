from typing import List, Dict, Tuple, Any

def reciprocal_rank_fusion(
    fts_results: List[Any], 
    vector_results: List[Any], 
    k: int = 60
) -> List[Tuple[Any, float]]:
    """Executes Reciprocal Rank Fusion (RRF) to merge and rank results from two retrieval pipelines.
    
    Args:
        fts_results: List of objects (e.g., Book models or IDs) returned by Full Text Search, ordered by relevance.
        vector_results: List of objects returned by Vector Search, ordered by relevance.
        k: Smoothing constant (default: 60).
        
    Returns:
        A sorted list of tuples (item, rrf_score) in descending order of relevance.
    """
    rrf_scores: Dict[Any, float] = {}

    # Helper to calculate RRF score contribution
    def apply_ranking(results_list):
        for rank, item in enumerate(results_list, start=1):
            # If item is SQLAlchemy model, we can key by its ID for deduplication
            item_key = item.id if hasattr(item, 'id') else item
            
            if item_key not in rrf_scores:
                rrf_scores[item_key] = {"item": item, "score": 0.0}
            
            # RRF formula: 1 / (k + rank)
            rrf_scores[item_key]["score"] += 1.0 / (k + rank)

    # Apply rank from both search engines
    apply_ranking(fts_results)
    apply_ranking(vector_results)

    # Sort results by score in descending order
    sorted_results = sorted(
        rrf_scores.values(), 
        key=lambda x: x["score"], 
        reverse=True
    )

    return [(res["item"], res["score"]) for res in sorted_results]
