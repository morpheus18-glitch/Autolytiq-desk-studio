# Autolytiq Metrics Package

This package provides Prometheus metrics middleware and collectors for Autolytiq Go services.

## Features

- HTTP request metrics (RED: Request rate, Error rate, Duration)
- Database connection pool monitoring
- Database query timing
- WebSocket connection tracking
- Easy integration with gorilla/mux router

## Installation

Add to your service's `go.mod`:

```go
require github.com/autolytiq/shared/metrics v0.0.0
```

For local development, add a replace directive:

```go
replace github.com/autolytiq/shared/metrics => ../shared/metrics
```

## Usage

### Basic Setup

```go
package main

import (
    "net/http"
    "github.com/gorilla/mux"
    "github.com/autolytiq/shared/metrics"
)

func main() {
    // Create metrics instance
    m := metrics.New(metrics.Config{
        ServiceName: "my-service",
    })

    // Create router
    router := mux.NewRouter()

    // Add metrics middleware
    router.Use(m.Middleware)

    // Add metrics endpoint
    router.Handle("/metrics", m.Handler())

    // Add your routes
    router.HandleFunc("/health", healthHandler)
    router.HandleFunc("/api/users", usersHandler)

    http.ListenAndServe(":8080", router)
}
```

### Database Metrics

```go
// Option 1: Use query timer
timer := m.NewDBQueryTimer("select", "users")
rows, err := db.Query("SELECT * FROM users WHERE id = $1", id)
timer.Done()

// Option 2: Use defer pattern
func getUser(id string) (*User, error) {
    defer m.ObserveQuery("select", "users")()
    return db.QueryRow("SELECT * FROM users WHERE id = $1", id)
}

// Start automatic connection pool monitoring
collector := metrics.NewDBStatsCollector(m, db, 15*time.Second)
collector.Start()
defer collector.Stop()
```

### WebSocket Metrics

```go
// When a WebSocket connects
m.IncrementWebsockets()

// When a WebSocket disconnects
m.DecrementWebsockets()

// Or set the absolute count
m.SetActiveWebsockets(count)
```

## Exposed Metrics

### HTTP Metrics

| Metric                                    | Type      | Labels                             | Description                |
| ----------------------------------------- | --------- | ---------------------------------- | -------------------------- |
| `autolytiq_http_requests_total`           | Counter   | method, path, status_code, service | Total HTTP requests        |
| `autolytiq_http_request_duration_seconds` | Histogram | method, path, status_code, service | Request duration           |
| `autolytiq_http_requests_in_flight`       | Gauge     | service                            | Current in-flight requests |

### Database Metrics

| Metric                                 | Type      | Labels                    | Description          |
| -------------------------------------- | --------- | ------------------------- | -------------------- |
| `autolytiq_db_queries_total`           | Counter   | operation, table, service | Total DB queries     |
| `autolytiq_db_query_duration_seconds`  | Histogram | operation, table, service | Query duration       |
| `autolytiq_db_connection_errors_total` | Counter   | service                   | Connection errors    |
| `autolytiq_db_pool_connections_max`    | Gauge     | service                   | Max pool connections |
| `autolytiq_db_pool_connections_in_use` | Gauge     | service                   | Connections in use   |
| `autolytiq_db_pool_connections_idle`   | Gauge     | service                   | Idle connections     |

### WebSocket Metrics

| Metric                                   | Type  | Labels  | Description           |
| ---------------------------------------- | ----- | ------- | --------------------- |
| `autolytiq_websocket_connections_active` | Gauge | service | Active WS connections |

## Integration Example

See `services/api-gateway/main.go` for a complete integration example.
