# Spends Tracker Backend

This is the backend API for the Spends Tracker application, built with FastAPI and SQLAlchemy.

## Features

- RESTful API endpoints for managing purchases, warranties, retailers, and brands
- Analytics endpoints for spending insights
- Data import/export functionality
- SQLite database for local development (migratable to PostgreSQL)

## Tech Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **Database:** SQLite (development) → PostgreSQL (production)
- **ORM:** SQLAlchemy 2.0+
- **Validation:** Pydantic v2
- **Migrations:** Alembic

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spends/backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file as needed
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Start the development server**
   ```bash
   python run_server.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn app.main:app --reload
   ```

7. **Access the API**
   - API root: http://localhost:8000
   - Documentation: http://localhost:8000/docs

## Running Tests

```bash
pytest
```

## Migrating to PostgreSQL

When you're ready to switch to PostgreSQL:

1. Start PostgreSQL with Docker:
   ```bash
   docker-compose up -d
   ```

2. Update your `.env` file to use PostgreSQL:
   ```env
   DATABASE_URL=postgresql+asyncpg://spends_user:spends_password@localhost/spends_tracker
   ```

3. Run migrations again:
   ```bash
   alembic upgrade head
   ```

## Cloud Deployment

The application is designed for easy deployment to cloud platforms. Here are guides for popular platforms:

### Deploy to Render

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Set the build command to:
   ```bash
   cd backend && pip install -r requirements.txt
   ```
4. Set the start command to:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add environment variables as needed (DATABASE_URL, etc.)

### Deploy to Railway

1. Create a new project on Railway
2. Connect to your GitHub repository
3. Add a new service and select your repository
4. Set the deploy command to:
   ```bash
   cd backend && pip install -r requirements.txt && alembic upgrade head
   ```
5. Set the start command to:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Deploy to AWS, GCP, or Azure

The application can be deployed to any cloud platform that supports Docker containers. Use the provided Dockerfile and docker-compose.yml as a starting point.

## API Documentation

Auto-generated API documentation is available at `/docs` endpoint when the server is running.