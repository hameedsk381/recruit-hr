# Stage 1: Build the React application
FROM oven/bun:1.2.11 AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the frontend code
COPY . .

# Build argument for the API URL (baked into the build)
ARG VITE_API_URL=http://localhost:3005
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN bun run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
