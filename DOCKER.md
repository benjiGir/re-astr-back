# Docker Guide

## Quick Start

### Development (dependencies only)

Run only PostgreSQL and MinIO for local development:

```bash
# Start dependencies
docker-compose -f docker-compose.dev.yml up -d

# Run app locally with hot-reload
pnpm run start:dev
```

The app will connect to:
- PostgreSQL: `localhost:5432`
- MinIO: `localhost:9000`

### Production (full stack)

Run the entire application stack with Docker:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

Access:
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001

## Building the Docker Image

### Build manually

```bash
docker build -t re-astr-server:latest .
```

### Build with docker-compose

```bash
docker-compose build
```

### Build with specific Node version

```bash
docker build --build-arg NODE_VERSION=22 -t re-astr-server:latest .
```

## Environment Variables

Create a `.env` file for production secrets:

```env
BETTER_AUTH_SECRET=your-production-secret-here
COOKIE_SECRET=your-cookie-secret-here
```

Then start with:

```bash
docker-compose --env-file .env up -d
```

## Database Migrations

Run migrations inside the container:

```bash
# Generate migration
docker-compose exec app pnpm run db:generate

# Apply migration
docker-compose exec app pnpm run db:migrate

# Open Drizzle Studio (not available in container)
# Use local: pnpm run db:studio
```

## Healthcheck

The app includes a built-in healthcheck on `/health`:

```bash
curl http://localhost:3000/health
```

Docker will automatically restart the container if unhealthy.

## Multi-stage Build Explained

The Dockerfile uses 3 stages for optimization:

1. **deps**: Install all dependencies (dev + prod)
2. **builder**: Build TypeScript → JavaScript
3. **runner**: Minimal production image (~150MB)

### Image sizes
- `deps`: ~500MB
- `builder`: ~550MB
- `runner`: ~150MB (final image)

## Production Best Practices

### 1. Use secrets management

Don't commit secrets to `.env`:

```bash
# Generate secure secrets
openssl rand -base64 32  # For BETTER_AUTH_SECRET
openssl rand -base64 32  # For COOKIE_SECRET
```

### 2. Use external PostgreSQL

For production, use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.):

```yaml
# docker-compose.prod.yml
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:pass@your-db-host:5432/re-astr
```

### 3. Use external MinIO/S3

For production, use AWS S3 or managed MinIO:

```yaml
services:
  app:
    environment:
      MINIO_ENDPOINT: s3.amazonaws.com
      MINIO_USE_SSL: "true"
      MINIO_ACCESS_KEY: ${AWS_ACCESS_KEY}
      MINIO_SECRET_KEY: ${AWS_SECRET_KEY}
```

### 4. Enable HTTPS

Use a reverse proxy (nginx, Traefik, Caddy):

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs app
```

### Database connection error

Ensure PostgreSQL is healthy:
```bash
docker-compose ps
docker-compose logs postgres
```

### Port already in use

Change ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any free port
```

### Image too large

The production image is optimized (~150MB). If larger:
- Check `.dockerignore` includes `node_modules`, `dist`
- Use `pnpm prune --prod` (already in Dockerfile)
- Use Alpine Linux base image (already in Dockerfile)

## Development Tips

### Hot reload with Docker (not recommended)

For development, it's better to run dependencies only:

```bash
docker-compose -f docker-compose.dev.yml up -d
pnpm run start:dev
```

But if you need hot-reload in Docker:

```yaml
# docker-compose.override.yml
services:
  app:
    build:
      target: deps  # Stop at deps stage
    command: pnpm run start:dev
    volumes:
      - ./src:/app/src  # Mount source code
      - ./package.json:/app/package.json
```

### Shell access

```bash
# Production container
docker-compose exec app sh

# Or run a new container
docker run -it --rm re-astr-server:latest sh
```

### Cleanup

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove images
docker rmi re-astr-server:latest

# Prune everything (careful!)
docker system prune -a --volumes
```
