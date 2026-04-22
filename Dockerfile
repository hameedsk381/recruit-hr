# Use Bun's official image as the base image
FROM oven/bun:1.2.11

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lock to install dependencies
COPY package.json bun.lock ./

# Install dependencies with frozen lockfile for consistency
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (based on package.json/index.ts)
EXPOSE 3005

# Create a non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

USER appuser

# Start the application
CMD ["bun", "run", "index.ts"]