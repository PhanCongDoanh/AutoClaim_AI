# AutoClaim AI service - chạy suy luận bằng CPU (không cần GPU)
FROM python:3.11-slim-bookworm

# Thư viện hệ thống mà OpenCV cần
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài PyTorch bản CPU TRƯỚC, để ultralytics không kéo bản CUDA nặng vài GB
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code + model (weights/ được copy vào image; compose còn mount đè để đổi model không cần build lại)
COPY . .

EXPOSE 5000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
