package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"autolytiq/shared/auth"
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
	// Add service authentication middleware for inter-service security
	serviceSecret := getEnv("SERVICE_SECRET", "")
	server.router.Use(auth.ServiceAuthMiddleware(auth.NewServiceAuthConfig(serviceSecret)))

	port := getEnv("PORT", "8090")
	addr := fmt.Sprintf(":%s", port)

	srv := &http.Server{
		Addr:    addr,
		Handler: server.router,
	}

	// Channel to listen for shutdown signals
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		logger.Infof("Settings service listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-stop
	logger.Info("Shutting down gracefully...")

	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Errorf("Graceful shutdown failed: %v", err)
	}

	logger.Info("Server stopped")
}
