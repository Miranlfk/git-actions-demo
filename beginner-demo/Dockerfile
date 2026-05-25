# Minimal Python image used by the Beginner CI/CD demo.
# Build context is the repo root so we can COPY from both src/ and beginner-demo/:
#   docker build -f beginner-demo/Dockerfile -t calc:local .

FROM python:3.12-slim

WORKDIR /app

COPY src/calculator.py /app/calculator.py
COPY beginner-demo/app.py /app/app.py

CMD ["python", "/app/app.py"]
