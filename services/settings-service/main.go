package main

import (
	"fmt"
	"net/http"
	"os"

	"autolytiq/shared/logging"
)

var logger *logging.Logger

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Initialize logger
	logger = logging.New(logging.Config{
		Service: "settings-service",
	})

	// Get database connection string from environment (required)
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		logger.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	db, err := NewPostgresSettingsDB(connStr)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		logger.Fatalf("Failed to initialize schema: %v", err)
	}

	logger.Info("Settings service database initialized successfully")

	// Create and start server
	server := NewServer(db)

	// Apply logging middleware
	server.router.Use(logging.RequestIDMiddleware)
	server.router.Use(logging.RequestLoggingMiddleware(logger))

	port := getEnv("PORT", "8090")
	addr := fmt.Sprintf(":%s", port)
	logger.Infof("Settings service listening on %s", addr)

	if err := http.ListenAndServe(addr, server.router); err != nil {
		logger.Fatalf("Server failed: %v", err)
	}
}
