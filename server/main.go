package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type Task struct {
	ID          string  `json:"id"`
	UserID      string  `json:"user_id"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	Position    int     `json:"position"`
	DueDate     *string `json:"due_date,omitempty"`
	AssigneeID  *string `json:"assignee_id,omitempty"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type CreateTaskRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	DueDate     *string `json:"due_date,omitempty"`
	AssigneeID  *string `json:"assignee_id,omitempty"`
}

type UpdateTaskRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Status      *string `json:"status,omitempty"`
	Priority    *string `json:"priority,omitempty"`
	Position    *int    `json:"position,omitempty"`
	DueDate     *string `json:"due_date,omitempty"`
	AssigneeID  *string `json:"assignee_id,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

var (
	tasks   = make(map[string]*Task)
	tasksMu sync.RWMutex
	counter int
)

func generateID() string {
	counter++
	return fmt.Sprintf("task_%d_%d", time.Now().UnixMilli(), counter)
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, resp APIResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

func handleGetTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Error: "method not allowed"})
		return
	}

	tasksMu.RLock()
	result := make([]*Task, 0, len(tasks))
	for _, t := range tasks {
		result = append(result, t)
	}
	tasksMu.RUnlock()

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

func handleCreateTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Error: "method not allowed"})
		return
	}

	var req CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid JSON body"})
		return
	}

	if strings.TrimSpace(req.Title) == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "title is required"})
		return
	}

	validStatuses := map[string]bool{"todo": true, "in_progress": true, "in_review": true, "done": true}
	if !validStatuses[req.Status] {
		req.Status = "todo"
	}

	validPriorities := map[string]bool{"low": true, "normal": true, "high": true}
	if !validPriorities[req.Priority] {
		req.Priority = "normal"
	}

	now := time.Now().UTC().Format(time.RFC3339)
	task := &Task{
		ID:          generateID(),
		UserID:      "api-user",
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		Position:    len(tasks) * 1000,
		DueDate:     req.DueDate,
		AssigneeID:  req.AssigneeID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	tasksMu.Lock()
	tasks[task.ID] = task
	tasksMu.Unlock()

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: task})
}

func handleTaskByID(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	id := strings.TrimPrefix(path, "/api/tasks/")
	if id == "" || id == path {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "task ID required"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		tasksMu.RLock()
		task, exists := tasks[id]
		tasksMu.RUnlock()
		if !exists {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "task not found"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: task})

	case http.MethodPut, http.MethodPatch:
		var req UpdateTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid JSON body"})
			return
		}

		tasksMu.Lock()
		task, exists := tasks[id]
		if !exists {
			tasksMu.Unlock()
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "task not found"})
			return
		}

		if req.Title != nil {
			task.Title = strings.TrimSpace(*req.Title)
		}
		if req.Description != nil {
			task.Description = req.Description
		}
		if req.Status != nil {
			task.Status = *req.Status
		}
		if req.Priority != nil {
			task.Priority = *req.Priority
		}
		if req.Position != nil {
			task.Position = *req.Position
		}
		if req.DueDate != nil {
			task.DueDate = req.DueDate
		}
		if req.AssigneeID != nil {
			task.AssigneeID = req.AssigneeID
		}
		task.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		tasksMu.Unlock()

		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: task})

	case http.MethodDelete:
		tasksMu.Lock()
		_, exists := tasks[id]
		if !exists {
			tasksMu.Unlock()
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "task not found"})
			return
		}
		delete(tasks, id)
		tasksMu.Unlock()
		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: "task deleted"})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Error: "method not allowed"})
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{
		"status":  "healthy",
		"version": "1.0.0",
		"service": "momentum-board-api",
	}})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/api/health", corsMiddleware(handleHealth))
	http.HandleFunc("/api/tasks", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetTasks(w, r)
		case http.MethodPost:
			handleCreateTask(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, APIResponse{Error: "method not allowed"})
		}
	}))
	http.HandleFunc("/api/tasks/", corsMiddleware(handleTaskByID))

	log.Printf("Momentum Board API running on :%s", port)
	log.Printf("Endpoints:")
	log.Printf("  GET    /api/health       - Health check")
	log.Printf("  GET    /api/tasks        - List all tasks")
	log.Printf("  POST   /api/tasks        - Create a task")
	log.Printf("  GET    /api/tasks/:id    - Get task by ID")
	log.Printf("  PATCH  /api/tasks/:id    - Update task")
	log.Printf("  DELETE /api/tasks/:id    - Delete task")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
