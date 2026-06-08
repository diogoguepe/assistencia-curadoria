import logging
from sqlalchemy import text
from backend.app.database import engine, Base
from shared.models import Book, Feedback, QueryLog

logger = logging.getLogger("backend")

def init_database():
    """Initializes the database: extensions, tables, columns and indices."""
    try:
        with engine.connect() as conn:
            # 1. Enable pgvector extension
            logger.info("Enabling pgvector extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()

            # 2. Create tables using SQLAlchemy metadata
            logger.info("Creating tables...")
            Base.metadata.create_all(bind=engine)
            conn.commit()

            # 3. Create TSVECTOR generated column for Portuguese FTS if it does not exist
            logger.info("Creating generated tsvector column for hybrid search...")
            # Check if column exists
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='books' AND column_name='fts_vector';"
            ))
            if not result.fetchone():
                conn.execute(text(
                    "ALTER TABLE books ADD COLUMN fts_vector tsvector GENERATED ALWAYS AS ("
                    "to_tsvector('portuguese', coalesce(title, '') || ' ' || "
                    "coalesce(authors, '') || ' ' || "
                    "coalesce(genres, '') || ' ' || "
                    "coalesce(synopsis, ''))"
                    ") STORED;"
                ))
                conn.commit()

            # 4. Create GIN index on fts_vector
            logger.info("Creating GIN index for full text search...")
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS books_fts_idx ON books USING GIN (fts_vector);"
            ))
            conn.commit()

            # 5. Create HNSW index on pgvector embedding column
            logger.info("Creating HNSW index for vector search...")
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS books_embedding_hnsw_idx ON books USING hnsw (embedding vector_cosine_ops);"
            ))
            conn.commit()

            logger.info("Database initialization completed successfully.")
            
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise e

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_database()
