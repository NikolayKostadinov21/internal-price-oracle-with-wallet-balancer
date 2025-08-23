#!/bin/bash

# Exit on any error
set -e

# Configuration
NETWORK_NAME="price-oracle-network"
MYSQL_CONTAINER="price-oracle-mysql"
REDIS_CONTAINER="price-oracle-redis"
ADMINER_CONTAINER="price-oracle-adminer"
MYSQL_VOLUME="price-oracle-mysql-data"
REDIS_VOLUME="price-oracle-redis-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function for failed deployments
cleanup() {
    log_warn "Cleaning up failed deployment..."
    docker stop $MYSQL_CONTAINER $REDIS_CONTAINER $ADMINER_CONTAINER 2>/dev/null || true
    docker rm $MYSQL_CONTAINER $REDIS_CONTAINER $ADMINER_CONTAINER 2>/dev/null || true
}

# Set trap for cleanup on script exit
trap cleanup EXIT

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

log_info "Starting Price Oracle Services with Pure Docker..."

# Create network (idempotent)
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    log_info "Creating network: $NETWORK_NAME"
    docker network create $NETWORK_NAME
else
    log_info "Network $NETWORK_NAME already exists"
fi

# Create volumes (idempotent)
if ! docker volume ls | grep -q "$MYSQL_VOLUME"; then
    log_info "Creating MySQL volume: $MYSQL_VOLUME"
    docker volume create $MYSQL_VOLUME
else
    log_info "MySQL volume $MYSQL_VOLUME already exists"
fi

if ! docker volume ls | grep -q "$REDIS_VOLUME"; then
    log_info "Creating Redis volume: $REDIS_VOLUME"
    docker volume create $REDIS_VOLUME
else
    log_info "Redis volume $REDIS_VOLUME already exists"
fi

# Check if containers already exist
if docker ps -a --format "{{.Names}}" | grep -q "$MYSQL_CONTAINER"; then
    log_warn "Container $MYSQL_CONTAINER already exists. Removing..."
    docker rm -f $MYSQL_CONTAINER
fi

if docker ps -a --format "{{.Names}}" | grep -q "$REDIS_CONTAINER"; then
    log_warn "Container $REDIS_CONTAINER already exists. Removing..."
    docker rm -f $REDIS_CONTAINER
fi

if docker ps -a --format "{{.Names}}" | grep -q "$ADMINER_CONTAINER"; then
    log_warn "Container $ADMINER_CONTAINER already exists. Removing..."
    docker rm -f $ADMINER_CONTAINER
fi

# Start MySQL
log_info "Starting MySQL container..."
docker run -d \
  --name $MYSQL_CONTAINER \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD=1234 \
  -e MYSQL_DATABASE=price_oracle \
  -e MYSQL_USER=oracle_user \
  -e MYSQL_PASSWORD=1234 \
  -p 3306:3306 \
  -v $MYSQL_VOLUME:/var/lib/mysql \
  --health-cmd="mysqladmin ping -h localhost" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=5 \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password

# Validate MySQL startup
sleep 5
if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    log_error "MySQL container failed to start"
    docker logs $MYSQL_CONTAINER
    exit 1
fi

# Start Redis
log_info "Starting Redis container..."
docker run -d \
  --name $REDIS_CONTAINER \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  -p 6379:6379 \
  -v $REDIS_VOLUME:/data \
  --health-cmd="redis-cli ping" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=5 \
  redis:7-alpine

# Validate Redis startup
sleep 3
if ! docker ps | grep -q "$REDIS_CONTAINER"; then
    log_error "Redis container failed to start"
    docker logs $REDIS_CONTAINER
    exit 1
fi

# Start Adminer
log_info "Starting Adminer container..."
docker run -d \
  --name $ADMINER_CONTAINER \
  --network $NETWORK_NAME \
  --restart unless-stopped \
  -p 8080:8080 \
  adminer:latest

# Validate Adminer startup
sleep 2
if ! docker ps | grep -q "$ADMINER_CONTAINER"; then
    log_error "Adminer container failed to start"
    docker logs $ADMINER_CONTAINER
    exit 1
fi

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    mysql_healthy=$(docker inspect $MYSQL_CONTAINER --format "{{.State.Health.Status}}" 2>/dev/null || echo "unhealthy")
    redis_healthy=$(docker inspect $REDIS_CONTAINER --format "{{.State.Health.Status}}" 2>/dev/null || echo "unhealthy")
    
    if [ "$mysql_healthy" = "healthy" ] && [ "$redis_healthy" = "healthy" ]; then
        log_info "All services are healthy!"
        break
    fi
    
    counter=$((counter + 5))
    if [ $counter -lt $timeout ]; then
        log_info "Waiting for services to be healthy... ($counter/$timeout seconds)"
        sleep 5
    fi
done

if [ $counter -ge $timeout ]; then
    log_warn "Services may not be fully healthy yet. Check status manually."
fi

# Remove trap since we're successful
trap - EXIT

# Final status report (fixed formatting)
log_info "Services started successfully! Final status:"
docker ps --filter "name=price-oracle" --format "table {{.Names}}\t{{.Status}}"

log_info "Service endpoints:"
log_info "  MySQL: localhost:3306"
log_info "  Redis: localhost:6379"
log_info "  Adminer: http://localhost:8080"

log_info "Check service health with: docker ps --filter 'name=price-oracle'"
log_info "View logs with: docker logs <container-name>"