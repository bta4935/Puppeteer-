# Use the official Node.js LTS image
FROM node:20-slim

# Install necessary dependencies for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node dependencies (no postinstall now)
RUN npm install --production --ignore-scripts

# Explicitly download Chrome for Puppeteer (respects .puppeteerrc.cjs)
RUN npx puppeteer browsers install chrome

# Copy the rest of your app
COPY . .

# Expose the port (matches your Express app)
EXPOSE 8787

# Start the app
CMD ["npm", "start"]
