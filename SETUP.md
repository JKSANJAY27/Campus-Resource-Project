# Setup & Deployment Guide

> **Campus Resource Dependency and Personalized Recommendation Graph**  
> *A Hybrid Multi-Model NoSQL Platform for Campus Resources, Skills, Courses, Projects, and Career Paths*

---

## 1. System Requirements

### Hardware Requirements
* **CPU**: Dual-core x86_64 or Apple Silicon (ARM64) processor (Quad-core recommended).
* **RAM**: 8 GB minimum (12 GB+ recommended to run all 4 database engines and application containers concurrently).
* **Storage**: 10 GB free disk space for container images, volumes, and dataset generation.

### Software Prerequisites
* **Docker Desktop** (v24.0+ recommended) with **Docker Compose v2+**.
* **Node.js** v20+ or v22+ (required only if running services outside Docker).
* **Python 3.10+** (optional, for offline benchmark chart generation scripts).

### Network Ports
Ensure the following local ports are not in use by other services:

| Port | Service | Protocol | Description |
| :---: | :--- | :---: | :--- |
| **3000** | Next.js Frontend | HTTP | Web user interface & visualization dashboards |
| **5000** | Express Backend API | HTTP | REST API & recommendation engine |
| **27017** | MongoDB 7.0 | TCP | Document store (primary entity catalog) |
| **7474** | Neo4j 5.18 Browser | HTTP | Graph visual explorer interface |
| **7687** | Neo4j 5.18 Bolt | Bolt | Binary graph database connection protocol |
| **6379** | Redis 7.2 | TCP | In-memory key-value cache & rate limiter |
| **9042** | Apache Cassandra 4.1 | CQL | Native wide-column time-series transport |

---

## 2. Quick Start with Docker Compose (Recommended)

The easiest and most reliable way to run the entire multi-model platform is via Docker Compose:

### Step 1: Clone or Navigate to the Repository
```bash
git clone <repository-url>
cd Campus-Resource-Project-master
```

### Step 2: Build and Start All 6 Services
```bash
docker compose up --build -d
```

This starts:
1. `crg_mongodb`: MongoDB 7.0 container with data persistence volume `mongo_data`.
2. `crg_neo4j`: Neo4j 5.18 container with APOC plugin enabled and volume `neo4j_data`.
3. `crg_redis`: Redis 7.2 container configured with `volatile-lru` eviction policy.
4. `crg_cassandra`: Apache Cassandra 4.1 container with keyspace volume `cassandra_data`.
5. `crg_backend`: Node.js Express API listening on `http://localhost:5000`.
6. `crg_frontend`: Next.js 14 standalone dashboard listening on `http://localhost:3000`.

### Step 3: Monitor Service Health
Check that all containers are healthy:
```bash
docker compose ps
```

Probe the backend health endpoint:
```bash
curl http://localhost:5000/api/v1/health
```

Expected JSON response:
```json
{
  "timestamp": "2026-10-08T14:30:00.000Z",
  "uptimeSeconds": 45,
  "overall": "healthy",
  "databases": {
    "mongodb": { "status": "connected", "latencyMs": 2.4 },
    "neo4j": { "status": "connected", "latencyMs": 3.1 },
    "redis": { "status": "connected", "latencyMs": 0.8 },
    "cassandra": { "status": "connected", "latencyMs": 2.9 }
  }
}
```

### Step 4: Seed the Databases
Once the database containers are healthy, execute the synthetic seeder:
```bash
docker compose exec backend npm run seed
```
Options available:
- `--scale=small`: 100 students, 30 courses, 50 skills, 20 projects, 15 jobs (~1K graph relationships).
- `--scale=medium`: 500 students, 80 courses, 100 skills, 60 projects, 40 jobs (~10K relationships).
- `--scale=large`: 2,500 students, 200 courses, 200 skills, 150 projects, 100 jobs (~50K relationships).

Example:
```bash
docker compose exec backend npx tsx scripts/seed.ts --scale=small --seed=42
```

### Step 5: Open the Web Application
Open your browser and navigate to:
```
http://localhost:3000
```
Explore the 14 interactive dashboards, including:
- Student Profile & Skill Gap Analysis
- Personalized Topological Learning Path
- React Flow Interactive Graph Explorer
- Cassandra Time-Series Activity Telemetry
- Multi-Model Benchmarking & Advanced NoSQL Demos

---

## 3. Local Development Setup (Without Docker Compose for App)

If you prefer developing the TypeScript backend and Next.js frontend locally with hot reload, run the database containers in Docker while running the app natively:

### Step 1: Start Only Database Containers
```bash
docker compose up -d mongodb neo4j redis cassandra
```

### Step 2: Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/campus_resource_graph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=campusgraphpassword
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_LOCAL_DC=datacenter1
CASSANDRA_KEYSPACE=campus_telemetry
CASSANDRA_PORT=9042
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Step 3: Install Dependencies & Run Backend
```bash
cd backend
npm install
npm run dev
```
Backend will start on `http://localhost:5000` with automatic TypeScript compilation via `tsx watch`.

### Step 4: Install Dependencies & Run Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend will start on `http://localhost:3000` with Next.js fast refresh.

---

## 4. Running the Automated Test Suites

### Zero-Dependency Hardening Suite (Node.js Built-In Test Runner)
Tests all 10 core dimensions and 9 distributed edge cases without external test frameworks:
```bash
node scripts/verify-phase13-hardening.cjs
```

### Backend Unit & Integration Tests (Vitest)
```bash
cd backend
npm test
```

### Run Reproducible Performance Benchmarks
```bash
cd backend
npm run benchmark:reproducible
```

---

## 5. Troubleshooting & FAQ

### Issue: Cassandra Container Takes Several Minutes to Start
* **Reason**: Cassandra initializes JVM heap memory, token ranges, and gossip protocols on first boot.
* **Fix**: The `docker-compose.yml` specifies a 45-second `start_period` and 8 retries. Wait approximately 90–120 seconds before triggering the seeder. Check logs with:
  ```bash
  docker compose logs -f cassandra
  ```

### Issue: Port Conflict on 27017, 6379, or 7687
* **Reason**: An existing local MongoDB, Redis, or Neo4j server is already running on the host machine.
* **Fix**: Stop the local services before starting Docker Compose:
  - Windows: `net stop MongoDB`, `Stop-Service redis`
  - Linux: `sudo systemctl stop mongod redis`
  - macOS: `brew services stop mongodb-community redis`

### Issue: Resetting Clean Environment
To wipe all container data and start with clean volumes:
```bash
docker compose down -v
docker compose up --build -d
```
