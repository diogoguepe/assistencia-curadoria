# Use official Node image
FROM node:20-slim

# Set work directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including devDependencies for build step)
RUN npm ci

# Copy source files
COPY . .

# Build Vite static assets and compile server.ts
RUN npm run build

# Expose port and run server
EXPOSE 3000
CMD ["npm", "start"]
