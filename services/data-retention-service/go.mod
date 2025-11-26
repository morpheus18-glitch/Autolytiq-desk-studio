module autolytiq/services/data-retention-service

go 1.18

require (
	autolytiq/services/shared/logging v0.0.0
	github.com/google/uuid v1.6.0
	github.com/gorilla/mux v1.8.1
	github.com/lib/pq v1.10.9
)

require github.com/rs/zerolog v1.31.0 // indirect

require (
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	golang.org/x/sys v0.14.0 // indirect
)

replace autolytiq/services/shared/logging => ../shared/logging
