FROM node:20

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose app port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]

