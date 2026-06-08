# Use official lightweight Python image
FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Install system dependencies (build-essential, libpq-dev for compiling psycopg2 if needed)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and shared codebase
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY ai/ ./ai/

# Set Python path to resolve imports correctly
ENV PYTHONPATH=/app

# Expose port and run server
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
