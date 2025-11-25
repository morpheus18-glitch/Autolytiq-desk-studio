package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Get database connection string from environment
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/autolytiq?sslmode=disable"
	}

	// Connect to database
	db, err := NewPostgresSettingsDB(connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize schema
	if err := db.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}

	log.Println("Settings service database initialized successfully")

	// Create and start server
	server := NewServer(db)

	port := getEnv("PORT", "8090")
	addr := fmt.Sprintf(":%s", port)
	log.Printf("Settings service listening on %s", addr)

	if err := http.ListenAndServe(addr, server.router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
