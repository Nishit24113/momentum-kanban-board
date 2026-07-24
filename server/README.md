# Momentum Board API (Go)

A lightweight REST API built with Go's standard library. Zero external dependencies.

## Endpoints

| Method | Path             | Description        |
|--------|------------------|--------------------|
| GET    | /api/health      | Health check       |
| GET    | /api/tasks       | List all tasks     |
| POST   | /api/tasks       | Create a task      |
| GET    | /api/tasks/:id   | Get task by ID     |
| PATCH  | /api/tasks/:id   | Update a task      |
| DELETE | /api/tasks/:id   | Delete a task      |

## Run

```bash
cd api
go run main.go
```

Server starts on port 8080 (override with `PORT` env var).

## Example Requests

```bash
# Create task
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Build feature", "status": "todo", "priority": "high"}'

# List tasks
curl http://localhost:8080/api/tasks

# Update task
curl -X PATCH http://localhost:8080/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# Delete task
curl -X DELETE http://localhost:8080/api/tasks/TASK_ID
```

## Architecture

- Pure standard library (`net/http`) — no frameworks
- In-memory storage with mutex-protected concurrent access
- CORS-enabled for frontend integration
- Input validation on all endpoints
- Structured JSON responses with success/error fields
