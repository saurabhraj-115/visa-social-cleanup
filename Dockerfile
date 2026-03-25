# ── Stage 1: build React frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# System deps (instagrapi needs some)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY *.py ./
COPY platforms/ platforms/

# Copy built frontend so FastAPI can serve it as static files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Data dir for persistent volume (tokens, runtime .env)
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PORT=8000

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
