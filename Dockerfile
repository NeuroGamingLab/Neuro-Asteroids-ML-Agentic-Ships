# ML-Driven Asteroid Ships — Streamlit app (Docker Hardened Image)
# Base: pinned digest for reproducible, auditable builds
FROM python:3.11-slim@sha256:0b23cfb7425d065008b778022a17b1551c82f8b4866ee5a7a200084b7e2eafbf

# Non-root user (UID/GID 1000)
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupadd -g "${APP_GID}" appgroup \
    && useradd -u "${APP_UID}" -g appgroup -s /bin/sh -m appuser

WORKDIR /app

# Install dependencies (no cache, no root cache dir)
COPY asteroids3/requirements.txt .
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Application files
COPY asteroids3/ .

# Writable dir for Streamlit cache/config; app dir owned by appuser
ENV XDG_CACHE_HOME=/app/.cache
RUN mkdir -p /app/.cache && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8501

# Healthcheck for orchestrators (Streamlit HTTP on 8501)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8501/_stcore/health')" || exit 1

# Read-only where possible; Streamlit binds to 0.0.0.0 for host access
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
