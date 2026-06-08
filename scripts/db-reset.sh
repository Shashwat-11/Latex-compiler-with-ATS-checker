#!/bin/bash
set -e
echo "Dropping and recreating database..."
docker compose -f docker/docker-compose.yml down -v postgres
docker compose -f docker/docker-compose.yml up -d postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 3
echo "Running migrations..."
pnpm db:migrate
echo "Seeding database..."
pnpm db:seed
echo "Database reset complete!"
