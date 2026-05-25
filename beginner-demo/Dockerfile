# Minimal Python image used by the Beginner CI/CD demo.
# Build context is the repo root so we can COPY from both src/ and beginner-demo/:
#   docker build -f beginner-demo/Dockerfile -t calc:local .
#
# Pass --build-arg PYTHON_VERSION=3.8 to demo a vulnerable build (triggers Trivy failures).
# Default is 3.12-slim (clean).

ARG PYTHON_VERSION=3.12-slim
FROM python:${PYTHON_VERSION}

WORKDIR /app

COPY src/calculator.py /app/calculator.py
COPY beginner-demo/app.py /app/app.py

CMD ["python", "/app/app.py"]
