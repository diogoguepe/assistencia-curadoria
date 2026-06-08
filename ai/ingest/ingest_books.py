import os
import json
import logging
import random
import asyncio
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal, engine
from backend.app.db_init import init_database
from shared.models import Book
from ai.providers.openrouter_provider import OpenRouterAIProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest")

def build_enriched_document(book_data: dict) -> str:
    """Builds an enriched text document summarizing all relevant metadata of a book.
    This consolidated text is sent to the embedding model.
    """
    return (
        f"Título: {book_data.get('title')}\n"
        f"Autor(es): {book_data.get('author')}\n"
        f"Gênero(s): {book_data.get('genre')}\n"
        f"Público-Alvo: {book_data.get('targetAudience')}\n"
        f"Idioma: {book_data.get('language', 'pt-BR')}\n"
        f"Ano de Publicação: {book_data.get('publicationYear')}\n"
        f"Sinopse: {book_data.get('synopsis')}\n"
        f"Tags: {', '.join(book_data.get('tags', []))}\n"
        f"Ganchos de Marketing: {'; '.join(book_data.get('marketingHooks', []))}"
    )

async def ingest_catalog():
    # 1. Initialize database (create extension, tables, indices)
    logger.info("Initializing database schema...")
    init_database()

    # 2. Read catalog from shared/books.json
    books_json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "shared",
        "books.json"
    )
    
    if not os.path.exists(books_json_path):
        logger.error(f"Books JSON data file not found at: {books_json_path}")
        return

    with open(books_json_path, 'r', encoding='utf-8') as f:
        books_list = json.load(f)

    logger.info(f"Loaded {len(books_list)} books from books.json.")

    # 3. Instantiate AI provider
    provider = OpenRouterAIProvider()
    has_api_key = bool(provider.api_key and "MY_GEMINI_API_KEY" not in provider.api_key and "YOUR_" not in provider.api_key)

    if not has_api_key:
        logger.warning(
            "OPENROUTER_API_KEY is not configured or is a placeholder. "
            "Seeding the database with mock embeddings for testing resilience."
        )

    db: Session = SessionLocal()
    try:
        for idx, book_data in enumerate(books_list, 1):
            book_id = str(book_data.get("id"))
            title = book_data.get("title")
            logger.info(f"[{idx}/{len(books_list)}] Processing book: '{title}' (ID: {book_id})...")

            # Create enriched document text
            enriched_text = build_enriched_document(book_data)
            
            # Generate embedding
            embedding = None
            if has_api_key:
                try:
                    embedding = await provider.generate_embedding(enriched_text)
                    logger.info(f"Embedding generated for '{title}' (size: {len(embedding)})")
                except Exception as e:
                    logger.error(f"Failed to generate embedding for '{title}': {e}. Using fallback mock embedding.")
            
            # Fallback mock embedding if API call failed or keys are missing
            if embedding is None:
                # 1536-dim mock vector
                embedding = [random.uniform(-0.1, 0.1) for _ in range(1536)]
            
            # Check if book already exists in DB
            db_book = db.query(Book).filter(Book.id == book_id).first()
            
            if db_book:
                logger.info(f"Book '{title}' already exists. Updating details...")
                db_book.title = title
                db_book.authors = book_data.get("author")
                db_book.genres = book_data.get("genre")
                db_book.target_audience = book_data.get("targetAudience")
                db_book.publication_year = int(book_data.get("publicationYear"))
                db_book.language = book_data.get("language", "pt-BR")
                db_book.isbn = book_data.get("isbn")
                db_book.synopsis = book_data.get("synopsis")
                db_book.price = book_data.get("price")
                db_book.pages = book_data.get("pages")
                db_book.tags = book_data.get("tags", [])
                db_book.marketing_hooks = book_data.get("marketingHooks", [])
                db_book.cover_color = book_data.get("coverColor")
                db_book.embedding = embedding
            else:
                logger.info(f"Inserting new book '{title}'...")
                new_book = Book(
                    id=book_id,
                    title=title,
                    authors=book_data.get("author"),
                    genres=book_data.get("genre"),
                    target_audience=book_data.get("targetAudience"),
                    publication_year=int(book_data.get("publicationYear")),
                    language=book_data.get("language", "pt-BR"),
                    isbn=book_data.get("isbn"),
                    synopsis=book_data.get("synopsis"),
                    price=book_data.get("price"),
                    pages=book_data.get("pages"),
                    tags=book_data.get("tags", []),
                    marketing_hooks=book_data.get("marketingHooks", []),
                    cover_color=book_data.get("coverColor"),
                    embedding=embedding
                )
                db.add(new_book)
            
            db.commit()

        logger.info("Database ingestion successfully finished.")
    
    except Exception as e:
        logger.error(f"Error during catalog ingestion: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(ingest_catalog())
