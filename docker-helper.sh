#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_help() {
    echo -e "${BLUE}RE-ASTR Docker Helper${NC}"
    echo ""
    echo "Usage: ./docker-helper.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev         - Start dependencies only (PostgreSQL + MinIO)"
    echo "  up          - Start full stack (app + dependencies)"
    echo "  down        - Stop all services"
    echo "  build       - Build Docker image"
    echo "  rebuild     - Rebuild from scratch (no cache)"
    echo "  logs        - Show app logs"
    echo "  ps          - Show running containers"
    echo "  shell       - Open shell in app container"
    echo "  clean       - Remove all containers and volumes"
    echo "  migrate     - Run database migrations"
    echo "  test-build  - Test build without running"
    echo ""
}

case "$1" in
    dev)
        echo -e "${GREEN}Starting dependencies (PostgreSQL + MinIO)...${NC}"
        docker-compose -f docker-compose.dev.yml up -d
        echo -e "${GREEN}Dependencies started!${NC}"
        echo ""
        echo -e "${BLUE}Services:${NC}"
        echo "  PostgreSQL: localhost:5432"
        echo "  MinIO API: localhost:9000"
        echo "  MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
        echo ""
        echo -e "${YELLOW}Now run: pnpm run start:dev${NC}"
        ;;

    up)
        echo -e "${GREEN}Starting full stack...${NC}"
        docker-compose up -d
        echo -e "${GREEN}Stack started!${NC}"
        echo ""
        echo -e "${BLUE}Services:${NC}"
        echo "  API: http://localhost:3000"
        echo "  Swagger: http://localhost:3000/api"
        echo "  MinIO Console: http://localhost:9001"
        echo ""
        echo -e "${YELLOW}View logs: ./docker-helper.sh logs${NC}"
        ;;

    down)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        echo -e "${GREEN}All services stopped!${NC}"
        ;;

    build)
        echo -e "${GREEN}Building Docker image...${NC}"
        docker-compose build
        echo -e "${GREEN}Build complete!${NC}"
        ;;

    rebuild)
        echo -e "${GREEN}Rebuilding from scratch (no cache)...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}Rebuild complete!${NC}"
        ;;

    logs)
        echo -e "${BLUE}Showing app logs (Ctrl+C to exit)...${NC}"
        docker-compose logs -f app
        ;;

    ps)
        echo -e "${BLUE}Running containers:${NC}"
        docker-compose ps
        docker-compose -f docker-compose.dev.yml ps
        ;;

    shell)
        echo -e "${GREEN}Opening shell in app container...${NC}"
        docker-compose exec app sh
        ;;

    clean)
        echo -e "${RED}This will remove all containers and volumes!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker-compose -f docker-compose.dev.yml down -v
            echo -e "${GREEN}Cleanup complete!${NC}"
        fi
        ;;

    migrate)
        echo -e "${GREEN}Running database migrations...${NC}"
        docker-compose exec app pnpm run db:migrate
        echo -e "${GREEN}Migrations complete!${NC}"
        ;;

    test-build)
        echo -e "${GREEN}Testing Docker build...${NC}"
        docker build -t re-astr-server:test .
        echo -e "${GREEN}Build test successful!${NC}"
        docker images re-astr-server:test
        ;;

    *)
        print_help
        ;;
esac
