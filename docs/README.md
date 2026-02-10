# Documentation

## Available Documentation

- **[API Documentation](API.md)** - Complete REST API reference
  - All endpoints with methods and parameters
  - Complete schema definitions
  - File management system details
  - Testing examples with curl commands
  - CORS configuration and security considerations

- **[System Architecture](ARCHITECTURE.md)** - Complete system architecture overview
  - Frontend and backend architecture
  - Technology stack details
  - Deployment options
  - Performance optimizations

- **[Backend Documentation](../backend/README.md)** - Backend-specific documentation
  - API implementation details
  - Database schema information
  - Development setup
  - Deployment instructions

- **[Development Plan](DEVELOPMENT.md)** - Roadmap and development phases
  - Feature implementation timeline
  - Development methodology
  - Future enhancements

- **[Security Policy](SECURITY.md)** - Security guidelines and vulnerability reporting
  - Security best practices
  - Vulnerability reporting procedures
  - Security considerations

- **[Architecture Diagram](DIAGRAM.md)** - Visual system architecture
  - Mermaid flowchart showing data flow
  - Frontend/backend component relationships
  - API route structure
  - Build and deployment process

## Quick Start Guide

### 1. API Users

Start with **[API Documentation](API.md)** for:

- Complete endpoint reference
- Request/response examples
- Authentication details
- File upload procedures

### 2. System Understanding

Read **[System Architecture](ARCHITECTURE.md)** for:

- Overall system design
- Technology stack information
- Deployment architecture
- Component interactions

### 3. Backend Development

See **[Backend Documentation](../backend/README.md)** for:

- Development environment setup
- Database configuration
- Testing procedures
- Deployment instructions

### 4. Contributing

Check **[Development Plan](DEVELOPMENT.md)** for:

- Roadmap and milestones
- Feature development phases
- Contribution guidelines

## Development Setup

### Prerequisites

- Node.js 16+
- Python 3.10+

### Quick Commands

```bash
# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Development servers
npm run dev -- --port 3030                    # Frontend
cd backend && uvicorn app.main:app --reload --port 3031  # Backend

# Access points
# Frontend: http://localhost:3030
# API: http://localhost:3031/api
# API Docs: http://localhost:3031/docs
```

## Documentation Structure

```
docs/
├── README.md          # This file - Documentation overview
├── API.md             # Complete API documentation
├── ARCHITECTURE.md    # System architecture overview
├── DEVELOPMENT.md     # Development roadmap and phases
├── SECURITY.md        # Security policy and guidelines
└── DIAGRAM.md         # Visual architecture diagram

../
├── README.md          # Main project documentation
└── backend/
    └── README.md       # Backend-specific docs
```

## Getting Help

- **API Issues**: Check [API Documentation](API.md) first
- **Architecture Questions**: See [System Architecture](ARCHITECTURE.md)
- **Backend Problems**: Refer to [Backend Documentation](../backend/README.md)
- **Security Concerns**: Review [Security Policy](SECURITY.md)
- **General Questions**: Check main [README.md](../README.md)

## Community & Support

- **GitHub Repository**: Main project repository
- **Issues & Feature Requests**: Use GitHub issue tracker
- **Security Vulnerabilities**: Follow guidelines in [Security Policy](SECURITY.md)

---

**Documentation Version:** 1.0  
**Last Updated:** 2026-02-11
