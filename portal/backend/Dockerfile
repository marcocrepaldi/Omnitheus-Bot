FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    wget curl gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instala Chromium e dependências do Playwright
RUN playwright install chromium --with-deps

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
