package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func main() {
	// Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/autolytiq?sslmode=disable"
	}

	// Initialize database
	db, err := NewPostgresDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to database")

	// Initialize WebSocket hub
	hub := NewHub()
	go hub.Run()
	log.Println("WebSocket hub started")

	// Initialize handler
	handler := NewHandler(db, hub)

	// Setup router
	router := mux.NewRouter()

	// Health check
	router.HandleFunc("/health", handler.HealthCheck).Methods("GET")

	// API routes
	api := router.PathPrefix("/api/showroom").Subrouter()

	// Visit routes
	api.HandleFunc("/visits", handler.ListVisits).Methods("GET")
	api.HandleFunc("/visits", handler.CreateVisit).Methods("POST")
	api.HandleFunc("/visits/{id}", handler.GetVisit).Methods("GET")
	api.HandleFunc("/visits/{id}", handler.UpdateVisit).Methods("PATCH")
	api.HandleFunc("/visits/{id}/status", handler.ChangeStatus).Methods("POST")
	api.HandleFunc("/visits/{id}/vehicle", handler.AttachVehicle).Methods("POST")
	api.HandleFunc("/visits/{id}/close", handler.CloseVisit).Methods("POST")

	// Timer routes
	api.HandleFunc("/visits/{id}/timers", handler.ListTimers).Methods("GET")
	api.HandleFunc("/visits/{id}/timers", handler.StartTimer).Methods("POST")
	api.HandleFunc("/visits/{id}/timers/{timer_id}/stop", handler.StopTimer).Methods("POST")

	// Note routes
	api.HandleFunc("/visits/{id}/notes", handler.ListNotes).Methods("GET")
	api.HandleFunc("/visits/{id}/notes", handler.CreateNote).Methods("POST")
	api.HandleFunc("/visits/{id}/notes/{note_id}", handler.UpdateNote).Methods("PATCH")
	api.HandleFunc("/visits/{id}/notes/{note_id}", handler.DeleteNote).Methods("DELETE")

	// Event routes
	api.HandleFunc("/visits/{id}/events", handler.ListEvents).Methods("GET")

	// Workflow config routes
	api.HandleFunc("/workflow-config", handler.GetWorkflowConfig).Methods("GET")
	api.HandleFunc("/workflow-config", handler.UpdateWorkflowConfig).Methods("PUT")

	// WebSocket endpoint
	router.HandleFunc("/ws/showroom", handler.HandleWebSocket)

	// CORS middleware for development
	corsHandler := corsMiddleware(router)

	log.Printf("Showroom service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, corsHandler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// corsMiddleware adds CORS headers for development
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Dealership-ID, X-User-ID")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
