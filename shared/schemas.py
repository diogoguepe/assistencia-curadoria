from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

class BookSchema(BaseModel):
    id: str
    title: str
    author: str
    genre: str
    targetAudience: str
    publicationYear: int
    language: str
    isbn: str
    synopsis: str
    price: float
    pages: int
    tags: List[str]
    marketingHooks: List[str]
    coverColor: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class PipelineStep(BaseModel):
    title: str
    status: Literal['pending', 'active', 'completed', 'error']
    description: str
    details: Optional[str] = None
    durationMs: Optional[int] = None

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, description="A pergunta a ser feita para a curadoria.")

class AnswerResponse(BaseModel):
    answer: str
    references: List[BookSchema]
    pipeline: List[PipelineStep]
    responseTimeMs: int
    booksCount: int

class FeedbackRequest(BaseModel):
    requestId: str = Field(..., alias="requestId")
    rating: int = Field(..., ge=1, le=5, description="Nota de feedback de 1 a 5.")
    comment: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
