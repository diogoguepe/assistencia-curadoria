import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.app.config import settings

logger = logging.getLogger("backend")

# Create database engine
# pool_pre_ping=True checks connection status and reconnects if stale
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.critical(f"Failed to create database engine: {e}")
    raise e

Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
