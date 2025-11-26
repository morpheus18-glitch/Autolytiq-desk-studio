package main

import (
	"net/http"
	"os"

	"autolytiq/shared/logging"

	"github.com/gorilla/mux"
)

var logger *logging.Logger

func main() {
	// Initialize logger
	logger = logging.New(logging.Config{
		Service: "messaging-service",
	})

	// Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8089"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/autolytiq?sslmode=disable"
	}

	// Initialize database
	db, err := NewPostgresDB(dbURL, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize WebSocket hub
	hub := NewHub(logger)
	go hub.Run()
	logger.Info("WebSocket hub started")

	// Initialize handler
	handler := NewHandler(db, hub, logger)

	// Setup router
	router := mux.NewRouter()

	// Apply logging middleware
	router.Use(logging.RequestIDMiddleware)
	router.Use(logging.RequestLoggingMiddleware(logger))

	// Health check
	router.HandleFunc("/health", handler.HealthCheck).Methods("GET")

	// WebSocket endpoint
	router.HandleFunc("/ws/messaging", func(w http.ResponseWriter, r *http.Request) {
		ServeWs(hub, w, r)
	})

	// API routes
	api := router.PathPrefix("/api/messaging").Subrouter()

	// Conversations
	api.HandleFunc("/conversations", handler.ListConversations).Methods("GET")
	api.HandleFunc("/conversations", handler.CreateConversation).Methods("POST")
	api.HandleFunc("/conversations/{id}", handler.GetConversation).Methods("GET")
	api.HandleFunc("/conversations/{id}", handler.UpdateConversation).Methods("PATCH")

	// Messages
	api.HandleFunc("/conversations/{conversationId}/messages", handler.ListMessages).Methods("GET")
	api.HandleFunc("/conversations/{conversationId}/messages", handler.SendMessage).Methods("POST")
	api.HandleFunc("/conversations/{conversationId}/messages/{messageId}", handler.GetMessage).Methods("GET")
	api.HandleFunc("/conversations/{conversationId}/messages/{messageId}", handler.UpdateMessage).Methods("PATCH")
	api.HandleFunc("/conversations/{conversationId}/messages/{messageId}", handler.DeleteMessage).Methods("DELETE")

	// Read receipts
	api.HandleFunc("/conversations/{conversationId}/read", handler.MarkAsRead).Methods("POST")

	// Reactions
	api.HandleFunc("/conversations/{conversationId}/messages/{messageId}/reactions", handler.AddReaction).Methods("POST")
	api.HandleFunc("/conversations/{conversationId}/messages/{messageId}/reactions/{reactionType}", handler.RemoveReaction).Methods("DELETE")

	// Typing indicator
	api.HandleFunc("/conversations/{conversationId}/typing", handler.SetTyping).Methods("POST")

	// Participants
	api.HandleFunc("/conversations/{conversationId}/participants", handler.GetParticipants).Methods("GET")
	api.HandleFunc("/conversations/{conversationId}/participants", handler.AddParticipant).Methods("POST")
	api.HandleFunc("/conversations/{conversationId}/participants/{userId}", handler.RemoveParticipant).Methods("DELETE")

	// CORS middleware
	corsHandler := corsMiddleware(router)

	logger.Infof("Messaging service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, corsHandler); err != nil {
		logger.Fatalf("Server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Dealership-ID, X-User-ID, X-User-Name, X-Request-ID")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
