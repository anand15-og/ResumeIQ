# Multi-runtime image: Node.js 20 + Python 3
FROM node:20-bookworm-slim

# Install Python 3 runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Configure environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV RESUME_ANALYZER_PYTHON=/usr/bin/python3

# Expose port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/status', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application
CMD ["node", "server.js"]
