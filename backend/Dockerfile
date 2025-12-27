FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Port for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Health check endpoint
HEALTHCHECK CMD curl --fail http://localhost:8080/health || exit 1

# Run application
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1