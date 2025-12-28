# File Management API

A full-stack file management system built with FastAPI, React, and deployed on Google Cloud Platform using Compute Engine (VM).
Table of Contents

- Architecture Overview
- Technology Stack
- Architectural Decisions
- Prerequisites
- Local Development Setup
- Monitoring & Observability

Components:

Frontend: React application serving the user interface
Backend: FastAPI REST API handling business logic
Cloud SQL: Relational database for structured data (users, file metadata)
Elasticsearch: Full-text search engine for file content and metadata
Cloud Storage: Object storage for uploaded files
Prometheus: Metrics collection and monitoring

Technology Stack
Backend

FastAPI - Modern, fast Python web framework
SQLAlchemy (async) - ORM for database operations
asyncpg - Async PostgreSQL driver
Google Cloud Storage SDK - File storage
Elasticsearch Python Client - Search functionality for in file text search.
Prometheus FastAPI Instrumentator - Metrics

Frontend

React - UI framework
TypeScript - Type safety

Infrastructure

Cloud SQL (PostgresQL for dev) - Primary database
Elasticsearch 8.10 - Search engine
Prometheus - Monitoring
Docker & Docker Compose - Containerization
Google Compute Engine - VM hosting


Architectural Decisions:

Cloud Compute. Decision made for a basic home assignment, where I can run the application easily, and low-cost.
For production I would choose Cloud Run, so google manage
running the containers when requests arrive, and not just to always run. Furthermore, for production, we don't need
all what the VM offers, so we spend extra-money.
In addition, harder to scale with VM. For higher scale I would use GKE for healthy orchestration over the containers.

Data Models
PostgreSQL engine  for Structured Data:
Users Table:
    id
    email
    name
    role
    created_at
    last_login


Files Table:
    id
    name
    type
    size
    owner_id
    file_path
    created_at

owner_id is a foreign key for user's id, to define relationship between file and user - define ownership.

Elasticsearch for Search:

Indexes file metadata and extracted content, allows full-text search across filenames and content.

Cloud Storage for File Data:

Separates file storage from database, scalable and durable, and cheap compared to other databases.

For auth, I created jwt after receiving oauth token from google including crucial user's data.


### Prerequisites
For Local Development:

Docker Desktop (version 20.10+)
Docker Compose (version 2.0+)
Python 3.11+
Node.js 18+
Git

For GCP Deployment:

Google Cloud Platform account
gcloud CLI installed and authenticated
Firebase project created
Service account with appropriate permissions


Local Development Setup
1. Clone the Repository
git clone <repository-url>

2. cd file-management-api
2. Set Up Environment Variables

```
cp .env.example .env
```

Create a .env file in the root directory:
3. Run 

```
docker-compose up -d 
```


### Monitoring

I decided not to expose monitoring to the frontend, to not overload it. I thought it would look unrelated.
However, to reach Prometheus (monitoring) type in browser ${HOST}:9090, and the Prometheus UI will open.
There, client can type metrics queries.



## Future / Missing Features
- Run on Cloud Run
- CI/CD to test frontend as well
- Integration tests
- E2E tests
- Proper logging system