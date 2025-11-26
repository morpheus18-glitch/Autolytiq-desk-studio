package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"autolytiq/shared/logging"

	"github.com/gorilla/websocket"
)

// httpClient is a shared HTTP client with reasonable timeouts
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	},
}

// proxyRequest forwards an HTTP request to a target service
// It extracts dealership_id from JWT context and adds it as X-Dealership-ID header
func (s *Server) proxyRequest(w http.ResponseWriter, r *http.Request, targetServiceURL, basePath string) {
	// Get logger with context
	ctxLogger := s.logger.WithContext(r.Context())

	// Extract dealership ID from JWT context
	dealershipID := GetDealershipIDFromContext(r.Context())
	if dealershipID == "" {
		ctxLogger.Warn("No dealership_id found in JWT context")
		http.Error(w, `{"error":"Missing dealership context"}`, http.StatusBadRequest)
		return
	}

	// Build target URL
	// Remove the /api/v1 prefix and replace with service base
	targetURL := fmt.Sprintf("%s%s", targetServiceURL, r.URL.Path)
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	// Read request body
	var bodyBytes []byte
	if r.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(r.Body)
		if err != nil {
			ctxLogger.WithError(err).Error("Failed to read request body")
			http.Error(w, `{"error":"Failed to read request body"}`, http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()
	}

	// Create new request
	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		ctxLogger.WithError(err).Error("Failed to create proxy request")
		http.Error(w, `{"error":"Failed to create proxy request"}`, http.StatusInternalServerError)
		return
	}

	// Copy headers (except Host which should be set automatically)
	for name, values := range r.Header {
		if name == "Host" {
			continue // Let Go set the correct Host header
		}
		for _, value := range values {
			proxyReq.Header.Add(name, value)
		}
	}

	// Propagate logging headers
	logging.PropagateHeadersFromContext(r.Context(), proxyReq)

	// Add dealership context header
	proxyReq.Header.Set("X-Dealership-ID", dealershipID)

	// Also add user context for audit trails
	if userID := GetUserIDFromContext(r.Context()); userID != "" {
		proxyReq.Header.Set("X-User-ID", userID)
	}
	if email := GetEmailFromContext(r.Context()); email != "" {
		proxyReq.Header.Set("X-User-Email", email)
	}
	if role := GetRoleFromContext(r.Context()); role != "" {
		proxyReq.Header.Set("X-User-Role", role)
	}

	// Execute request
	resp, err := httpClient.Do(proxyReq)
	if err != nil {
		ctxLogger.WithError(err).WithFields(map[string]interface{}{
			"target_url": targetURL,
		}).Error("Proxy request failed")
		http.Error(w, fmt.Sprintf(`{"error":"Service unavailable: %v"}`, err), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		ctxLogger.WithError(err).Error("Failed to read response body")
		http.Error(w, `{"error":"Failed to read service response"}`, http.StatusInternalServerError)
		return
	}

	// Copy response headers
	for name, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(name, value)
		}
	}

	// Write response
	w.WriteHeader(resp.StatusCode)
	if _, err := w.Write(respBody); err != nil {
		ctxLogger.WithError(err).Error("Failed to write response")
	}

	ctxLogger.WithFields(map[string]interface{}{
		"target_url": targetURL,
		"status":     resp.StatusCode,
	}).Debug("Proxy request completed")
}

// WebSocket upgrader for the API gateway
var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// proxyWebSocket proxies WebSocket connections to a target service
func (s *Server) proxyWebSocket(w http.ResponseWriter, r *http.Request, targetServiceURL string) {
	// Get logger with context
	ctxLogger := s.logger.WithContext(r.Context())

	// Parse target URL and convert to WebSocket URL
	targetURL, err := url.Parse(targetServiceURL)
	if err != nil {
		ctxLogger.WithError(err).Error("Failed to parse target URL")
		http.Error(w, `{"error":"Invalid target URL"}`, http.StatusInternalServerError)
		return
	}

	// Convert http:// to ws:// or https:// to wss://
	wsScheme := "ws"
	if targetURL.Scheme == "https" {
		wsScheme = "wss"
	}

	// Build the WebSocket target URL
	wsTarget := fmt.Sprintf("%s://%s%s", wsScheme, targetURL.Host, r.URL.Path)
	if r.URL.RawQuery != "" {
		wsTarget += "?" + r.URL.RawQuery
	}

	ctxLogger.WithField("target", wsTarget).Debug("Proxying WebSocket connection")

	// Connect to the backend WebSocket service
	backendConn, resp, err := websocket.DefaultDialer.Dial(wsTarget, nil)
	if err != nil {
		ctxLogger.WithError(err).Error("Failed to connect to backend WebSocket")
		if resp != nil {
			ctxLogger.WithField("backend_status", resp.StatusCode).Error("Backend response status")
		}
		http.Error(w, `{"error":"Failed to connect to backend"}`, http.StatusServiceUnavailable)
		return
	}
	defer backendConn.Close()

	// Upgrade the client connection
	clientConn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		ctxLogger.WithError(err).Error("Failed to upgrade client connection")
		return
	}
	defer clientConn.Close()

	// Create error channels
	errChan := make(chan error, 2)

	// Client -> Backend
	go func() {
		for {
			messageType, message, err := clientConn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) &&
					!strings.Contains(err.Error(), "use of closed network connection") {
					ctxLogger.WithError(err).Debug("Client read error")
				}
				errChan <- err
				return
			}
			if err := backendConn.WriteMessage(messageType, message); err != nil {
				ctxLogger.WithError(err).Debug("Backend write error")
				errChan <- err
				return
			}
		}
	}()

	// Backend -> Client
	go func() {
		for {
			messageType, message, err := backendConn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) &&
					!strings.Contains(err.Error(), "use of closed network connection") {
					ctxLogger.WithError(err).Debug("Backend read error")
				}
				errChan <- err
				return
			}
			if err := clientConn.WriteMessage(messageType, message); err != nil {
				ctxLogger.WithError(err).Debug("Client write error")
				errChan <- err
				return
			}
		}
	}()

	// Wait for either goroutine to finish
	<-errChan
	ctxLogger.Debug("WebSocket connection closed")
}
