# Use an official Python runtime as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libasound2-dev \
    portaudio19-dev \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Define environment variable
ENV FLASK_APP=app.py

CMD gunicorn app:app --bind 0.0.0.0:$PORT
