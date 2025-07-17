# Use node:18 (Debian Bullseye)
FROM node:18

# Set non-interactive mode
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists
RUN apt-get update --allow-releaseinfo-change && \
    apt-get install -y --no-install-recommends \
    apt-utils \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    libffi-dev \
    libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip3 install --no-cache-dir --upgrade pip

# Install yt-dlp and dependencies
RUN pip3 install --no-cache-dir --verbose \
    yt-dlp \
    pycryptodomex \
    requests

# Install Express
RUN npm install --no-cache express

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
