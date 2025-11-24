package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
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
	// Extract dealership ID from JWT context
	dealershipID := GetDealershipIDFromContext(r.Context())
	if dealershipID == "" {
		log.Printf("WARNING: No dealership_id found in JWT context for request %s %s", r.Method, r.URL.Path)
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
			log.Printf("ERROR: Failed to read request body: %v", err)
			http.Error(w, `{"error":"Failed to read request body"}`, http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()
	}

	// Create new request
	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		log.Printf("ERROR: Failed to create proxy request: %v", err)
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
		log.Printf("ERROR: Proxy request failed for %s %s: %v", r.Method, targetURL, err)
		http.Error(w, fmt.Sprintf(`{"error":"Service unavailable: %v"}`, err), http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("ERROR: Failed to read response body: %v", err)
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
		log.Printf("ERROR: Failed to write response: %v", err)
	}

	log.Printf("PROXY: %s %s -> %s [%d]", r.Method, r.URL.Path, targetURL, resp.StatusCode)
}
