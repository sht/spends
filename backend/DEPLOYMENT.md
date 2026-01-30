# Deployment Guide - Spends Tracker

This document provides instructions for deploying the Spends Tracker application.

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB of RAM available
- Port 8000 and 3000 available (or modify docker-compose.yml)

## Quick Start

To deploy the application locally for development or testing:

```bash
# Clone the repository
git clone <repository-url>
cd spends

# Navigate to the backend directory
cd backend

# Start the application stack
docker-compose up -d

# The application will be available at:
# - Backend API: http://localhost:8000
# - Frontend: http://localhost:3000
# - PostgreSQL: localhost:5432 (internal use)
```

## Production Deployment

For production deployments, consider the following:

### Environment Configuration

Create a `.env` file in the backend directory with production settings:

```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://username:password@postgres:5432/spends_tracker_prod

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False

# CORS Configuration
FRONTEND_URL=https://yourdomain.com
```

### Docker Compose for Production

Use the production-ready docker-compose.yml:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: spends_tracker_postgres
    environment:
      POSTGRES_DB: spends_tracker_prod
      POSTGRES_USER: spends_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    image: your-registry/spends-tracker-backend:latest
    container_name: spends_tracker_backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://spends_user:secure_password@postgres/spends_tracker_prod
      - HOST=0.0.0.0
      - PORT=8000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: your-registry/spends-tracker-frontend:latest
    container_name: spends_tracker_frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:8000/api
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

## Database Migrations

When deploying updates that include database schema changes:

```bash
# Run migrations manually
docker-compose exec backend alembic upgrade head
```

## Backup and Restore

### Backup Database

```bash
# Backup the database
docker-compose exec postgres pg_dump -U spends_user spends_tracker > backup.sql
```

### Restore Database

```bash
# Restore the database
docker-compose exec -T postgres psql -U spends_user spends_tracker < backup.sql
```

## Monitoring and Logs

Check application logs:

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

## Scaling

The application can be scaled horizontally for the backend service:

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3
```

Note: When scaling, ensure you're using an external load balancer and shared database.

## Security Considerations

- Change default passwords
- Use HTTPS in production
- Limit exposed ports
- Regularly update base images
- Implement proper authentication and authorization

## Troubleshooting

Common issues and solutions:

1. **Database connection errors**: Ensure postgres service is healthy before starting backend
2. **Port conflicts**: Modify ports in docker-compose.yml if needed
3. **Permission errors**: Ensure proper ownership of volume directories
4. **Migration errors**: Run migrations manually after deployment

For additional support, check the logs or consult the documentation.