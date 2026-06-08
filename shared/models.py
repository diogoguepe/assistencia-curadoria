from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Numeric, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from backend.app.database import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    authors = Column(String(255), nullable=False) # Maps to author in frontend
    genres = Column(String(255), nullable=False)   # Maps to genre in frontend
    target_audience = Column(String(255), nullable=False) # Maps to targetAudience in frontend
    publication_year = Column(Integer, nullable=False)   # Maps to publicationYear
    language = Column(String(50), nullable=False, default="pt-BR")
    isbn = Column(String(50), nullable=False, unique=True)
    synopsis = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    pages = Column(Integer, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    marketing_hooks = Column(JSON, nullable=False, default=list)
    cover_color = Column(String(100), nullable=True)
    
    # 1536-dimensional vector embedding (text-embedding-3-small)
    embedding = Column(Vector(1536), nullable=True)

    def to_dict(self):
        """Converts database book model to frontend schema dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "author": self.authors,
            "genre": self.genres,
            "targetAudience": self.target_audience,
            "publicationYear": self.publication_year,
            "language": self.language,
            "isbn": self.isbn,
            "synopsis": self.synopsis,
            "price": float(self.price) if self.price is not None else 0.0,
            "pages": self.pages or 0,
            "tags": self.tags or [],
            "marketingHooks": self.marketing_hooks or [],
            "coverColor": self.cover_color or ""
        }

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(100), nullable=False, index=True)
    question = Column(Text, nullable=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(100), nullable=False, index=True)
    question = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    answer = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    books_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
