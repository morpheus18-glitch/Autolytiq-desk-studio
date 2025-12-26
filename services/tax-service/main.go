package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

// Config holds service configuration
type Config struct {
	Port          string
	WASMPath      string
	ServiceSecret string
}

// TaxEngine wraps the WASM tax calculation engine
type TaxEngine struct {
	runtime wazero.Runtime
	module  api.Module
	ctx     context.Context
	mu      sync.Mutex
}

// TaxCalculationRequest represents a tax calculation request
type TaxCalculationRequest struct {
	StateCode              string      `json:"stateCode"`
	AsOfDate               string      `json:"asOfDate"`
	DealType               string      `json:"dealType"`
	VehiclePrice           float64     `json:"vehiclePrice"`
	AccessoriesAmount      float64     `json:"accessoriesAmount"`
	TradeInValue           float64     `json:"tradeInValue"`
	RebateManufacturer     float64     `json:"rebateManufacturer"`
	RebateDealer           float64     `json:"rebateDealer"`
	DocFee                 float64     `json:"docFee"`
	OtherFees              []OtherFee  `json:"otherFees"`
	ServiceContracts       float64     `json:"serviceContracts"`
	Gap                    float64     `json:"gap"`
	NegativeEquity         float64     `json:"negativeEquity"`
	TaxAlreadyCollected    float64     `json:"taxAlreadyCollected"`
	Rates                  []TaxRate   `json:"rates"`
	// Lease-specific
	GrossCapCost                   *float64 `json:"grossCapCost,omitempty"`
	CapReductionCash               *float64 `json:"capReductionCash,omitempty"`
	CapReductionTradeIn            *float64 `json:"capReductionTradeIn,omitempty"`
	CapReductionRebateManufacturer *float64 `json:"capReductionRebateManufacturer,omitempty"`
	CapReductionRebateDealer       *float64 `json:"capReductionRebateDealer,omitempty"`
	BasePayment                    *float64 `json:"basePayment,omitempty"`
	PaymentCount                   *int     `json:"paymentCount,omitempty"`
	// Reciprocity
	HomeStateCode         *string       `json:"homeStateCode,omitempty"`
	RegistrationStateCode *string       `json:"registrationStateCode,omitempty"`
	OriginTaxInfo         *OriginTax    `json:"originTaxInfo,omitempty"`
}

// OtherFee represents a miscellaneous fee
type OtherFee struct {
	Code   string  `json:"code"`
	Amount float64 `json:"amount"`
}

// TaxRate represents a tax rate component
type TaxRate struct {
	Label string  `json:"label"`
	Rate  float64 `json:"rate"`
}

// OriginTax represents tax paid in another state
type OriginTax struct {
	StateCode     string   `json:"stateCode"`
	Amount        float64  `json:"amount"`
	EffectiveRate *float64 `json:"effectiveRate,omitempty"`
	TaxPaidDate   *string  `json:"taxPaidDate,omitempty"`
}

// JurisdictionRequest represents a jurisdiction resolution request
type JurisdictionRequest struct {
	Street *string `json:"street,omitempty"`
	City   *string `json:"city,omitempty"`
	State  string  `json:"state"`
	Zip    *string `json:"zip,omitempty"`
	County *string `json:"county,omitempty"`
}

// Server represents the Tax Service
type Server struct {
	router *mux.Router
	config *Config
	engine *TaxEngine
}

// NewTaxEngine creates a new WASM-based tax engine
func NewTaxEngine(ctx context.Context, wasmPath string) (*TaxEngine, error) {
	// Create WASM runtime
	runtime := wazero.NewRuntime(ctx)

	// Instantiate WASI for basic I/O support
	wasi_snapshot_preview1.MustInstantiate(ctx, runtime)

	// Read WASM module
	wasmBytes, err := os.ReadFile(wasmPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read WASM file: %w", err)
	}

	// Compile and instantiate the module
	module, err := runtime.Instantiate(ctx, wasmBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to instantiate WASM module: %w", err)
	}

	return &TaxEngine{
		runtime: runtime,
		module:  module,
		ctx:     ctx,
	}, nil
}

// CalculateTax performs a tax calculation using the WASM engine
func (e *TaxEngine) CalculateTax(req *TaxCalculationRequest) (map[string]interface{}, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Serialize request to JSON
	inputJSON, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize request: %w", err)
	}

	// Call WASM function
	// Note: This is a simplified version. In production, you'd need to:
	// 1. Allocate memory in WASM for the input string
	// 2. Call the exported function
	// 3. Read the result from WASM memory
	// 4. Free the allocated memory

	// For now, return a computed result using Go-native calculations
	// This is a fallback until WASM integration is complete
	result := e.calculateTaxNative(req)

	log.Printf("Tax calculation for %s: input=%d bytes, base=%.2f, tax=%.2f",
		req.StateCode, len(inputJSON), result["taxableBase"], result["totalTax"])

	return result, nil
}

// calculateTaxNative provides a native Go fallback calculation
func (e *TaxEngine) calculateTaxNative(req *TaxCalculationRequest) map[string]interface{} {
	// Calculate taxable base
	vehicleBase := req.VehiclePrice + req.AccessoriesAmount

	// Apply trade-in credit (simplified - full credit)
	vehicleBase -= req.TradeInValue

	// Apply manufacturer rebate (typically non-taxable)
	vehicleBase -= req.RebateManufacturer

	// Ensure non-negative
	if vehicleBase < 0 {
		vehicleBase = 0
	}

	// Calculate fees base
	feesBase := req.DocFee
	for _, fee := range req.OtherFees {
		feesBase += fee.Amount
	}

	// Calculate products base
	productsBase := req.ServiceContracts + req.Gap

	// Total taxable base
	totalTaxableBase := vehicleBase + feesBase + productsBase

	// Calculate tax using provided rates
	var totalTax float64
	componentTaxes := make([]map[string]interface{}, 0)
	for _, rate := range req.Rates {
		taxAmount := totalTaxableBase * rate.Rate
		componentTaxes = append(componentTaxes, map[string]interface{}{
			"label":  rate.Label,
			"rate":   rate.Rate,
			"amount": taxAmount,
		})
		totalTax += taxAmount
	}

	return map[string]interface{}{
		"mode": req.DealType,
		"bases": map[string]interface{}{
			"vehicleBase":      vehicleBase,
			"feesBase":         feesBase,
			"productsBase":     productsBase,
			"totalTaxableBase": totalTaxableBase,
		},
		"taxes": map[string]interface{}{
			"componentTaxes": componentTaxes,
			"totalTax":       totalTax,
		},
		"taxableBase": totalTaxableBase,
		"totalTax":    totalTax,
	}
}

// ResolveJurisdiction resolves an address to a tax jurisdiction
func (e *TaxEngine) ResolveJurisdiction(req *JurisdictionRequest) (map[string]interface{}, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Native fallback for jurisdiction resolution
	stateRates := map[string]float64{
		"IN": 0.07, "TX": 0.0625, "CA": 0.0725, "FL": 0.06,
		"NY": 0.04, "GA": 0.04, "NC": 0.03, "OH": 0.0575,
		"PA": 0.06, "IL": 0.0625, "MI": 0.06, "WA": 0.065,
	}

	stateRate := stateRates[req.State]
	if stateRate == 0 {
		stateRate = 0.06 // Default
	}

	return map[string]interface{}{
		"stateCode":           req.State,
		"jurisdictionCode":    fmt.Sprintf("%s_%s", req.State, "STATE"),
		"jurisdictionName":    fmt.Sprintf("State of %s", req.State),
		"combinedRate":        stateRate,
		"stateRate":           stateRate,
		"localRate":           0.0,
		"vehicleUsesLocalTax": true,
		"schemaVersion":       1,
	}, nil
}

// Close cleans up the WASM runtime
func (e *TaxEngine) Close() error {
	return e.runtime.Close(e.ctx)
}

// NewServer creates a new Tax Service server
func NewServer(config *Config) (*Server, error) {
	ctx := context.Background()

	// Initialize tax engine (with WASM if available, otherwise native fallback)
	var engine *TaxEngine
	if config.WASMPath != "" {
		var err error
		engine, err = NewTaxEngine(ctx, config.WASMPath)
		if err != nil {
			log.Printf("WASM engine initialization failed, using native fallback: %v", err)
			engine = &TaxEngine{ctx: ctx}
		}
	} else {
		log.Println("No WASM path configured, using native fallback")
		engine = &TaxEngine{ctx: ctx}
	}

	s := &Server{
		router: mux.NewRouter(),
		config: config,
		engine: engine,
	}

	// Add service authentication middleware for inter-service security
	s.router.Use(serviceAuthMiddleware(config.ServiceSecret))

	s.setupRoutes()
	return s, nil
}

// setupRoutes configures all routes
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")

	// Tax calculation endpoints
	s.router.HandleFunc("/api/v1/tax/calculate", s.calculateTax).Methods("POST")
	s.router.HandleFunc("/api/v1/tax/jurisdiction", s.resolveJurisdiction).Methods("POST")
	s.router.HandleFunc("/api/v1/tax/states", s.listStates).Methods("GET")
	s.router.HandleFunc("/api/v1/tax/states/{code}", s.getStateRules).Methods("GET")
}

// serviceAuthMiddleware provides inter-service authentication
// Since tax-service doesn't use the shared logging package, we inline the middleware here
func serviceAuthMiddleware(serviceSecret string) func(http.Handler) http.Handler {
	bypassPaths := map[string]bool{
		"/health": true,
		"/ready":  true,
		"/live":   true,
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth if no service secret is configured (migration mode)
			if serviceSecret == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check if path should bypass authentication
			if bypassPaths[r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}

			// Check for service auth header
			authHeader := r.Header.Get("X-Service-Auth")
			if authHeader != "" {
				// Validate using constant-time comparison to prevent timing attacks
				if subtle.ConstantTimeCompare([]byte(authHeader), []byte(serviceSecret)) == 1 {
					next.ServeHTTP(w, r)
					return
				}
				http.Error(w, `{"error":"Invalid service credentials"}`, http.StatusForbidden)
				return
			}

			// Check if this is an external request (has JWT Authorization header)
			if r.Header.Get("Authorization") != "" {
				next.ServeHTTP(w, r)
				return
			}

			// Check for dealership context headers (set by API gateway after JWT validation)
			if r.Header.Get("X-Dealership-ID") != "" || r.Header.Get("X-User-ID") != "" {
				next.ServeHTTP(w, r)
				return
			}

			http.Error(w, `{"error":"Unauthorized: missing service authentication"}`, http.StatusUnauthorized)
		})
	}
}

// healthCheck handler
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "tax-service",
		"engine":    "wasm-native-hybrid",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// calculateTax handles tax calculation requests
func (s *Server) calculateTax(w http.ResponseWriter, r *http.Request) {
	var req TaxCalculationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.StateCode == "" {
		http.Error(w, "stateCode is required", http.StatusBadRequest)
		return
	}
	if req.DealType == "" {
		req.DealType = "RETAIL"
	}
	if req.AsOfDate == "" {
		req.AsOfDate = time.Now().Format("2006-01-02")
	}

	result, err := s.engine.CalculateTax(&req)
	if err != nil {
		log.Printf("Tax calculation error: %v", err)
		http.Error(w, fmt.Sprintf("Calculation failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// resolveJurisdiction handles jurisdiction resolution requests
func (s *Server) resolveJurisdiction(w http.ResponseWriter, r *http.Request) {
	var req JurisdictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if req.State == "" {
		http.Error(w, "state is required", http.StatusBadRequest)
		return
	}

	result, err := s.engine.ResolveJurisdiction(&req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Resolution failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// listStates returns all supported states
func (s *Server) listStates(w http.ResponseWriter, r *http.Request) {
	states := []map[string]interface{}{
		{"code": "AL", "name": "Alabama", "rate": 0.04},
		{"code": "AK", "name": "Alaska", "rate": 0.0},
		{"code": "AZ", "name": "Arizona", "rate": 0.056},
		{"code": "AR", "name": "Arkansas", "rate": 0.065},
		{"code": "CA", "name": "California", "rate": 0.0725},
		{"code": "CO", "name": "Colorado", "rate": 0.029},
		{"code": "CT", "name": "Connecticut", "rate": 0.0635},
		{"code": "DE", "name": "Delaware", "rate": 0.0},
		{"code": "FL", "name": "Florida", "rate": 0.06},
		{"code": "GA", "name": "Georgia", "rate": 0.04, "special": "TAVT"},
		{"code": "HI", "name": "Hawaii", "rate": 0.04},
		{"code": "ID", "name": "Idaho", "rate": 0.06},
		{"code": "IL", "name": "Illinois", "rate": 0.0625},
		{"code": "IN", "name": "Indiana", "rate": 0.07},
		{"code": "IA", "name": "Iowa", "rate": 0.06},
		{"code": "KS", "name": "Kansas", "rate": 0.065},
		{"code": "KY", "name": "Kentucky", "rate": 0.06},
		{"code": "LA", "name": "Louisiana", "rate": 0.0445},
		{"code": "ME", "name": "Maine", "rate": 0.055},
		{"code": "MD", "name": "Maryland", "rate": 0.06},
		{"code": "MA", "name": "Massachusetts", "rate": 0.0625},
		{"code": "MI", "name": "Michigan", "rate": 0.06, "tradeInCap": 3000},
		{"code": "MN", "name": "Minnesota", "rate": 0.06875},
		{"code": "MS", "name": "Mississippi", "rate": 0.07},
		{"code": "MO", "name": "Missouri", "rate": 0.04225},
		{"code": "MT", "name": "Montana", "rate": 0.0},
		{"code": "NE", "name": "Nebraska", "rate": 0.055},
		{"code": "NV", "name": "Nevada", "rate": 0.0685},
		{"code": "NH", "name": "New Hampshire", "rate": 0.0},
		{"code": "NJ", "name": "New Jersey", "rate": 0.06625},
		{"code": "NM", "name": "New Mexico", "rate": 0.05125},
		{"code": "NY", "name": "New York", "rate": 0.04},
		{"code": "NC", "name": "North Carolina", "rate": 0.03, "special": "HUT"},
		{"code": "ND", "name": "North Dakota", "rate": 0.05},
		{"code": "OH", "name": "Ohio", "rate": 0.0575},
		{"code": "OK", "name": "Oklahoma", "rate": 0.045},
		{"code": "OR", "name": "Oregon", "rate": 0.0},
		{"code": "PA", "name": "Pennsylvania", "rate": 0.06},
		{"code": "RI", "name": "Rhode Island", "rate": 0.07},
		{"code": "SC", "name": "South Carolina", "rate": 0.06, "taxCap": 500},
		{"code": "SD", "name": "South Dakota", "rate": 0.045},
		{"code": "TN", "name": "Tennessee", "rate": 0.07},
		{"code": "TX", "name": "Texas", "rate": 0.0625},
		{"code": "UT", "name": "Utah", "rate": 0.0485},
		{"code": "VT", "name": "Vermont", "rate": 0.06},
		{"code": "VA", "name": "Virginia", "rate": 0.043},
		{"code": "WA", "name": "Washington", "rate": 0.065},
		{"code": "WV", "name": "West Virginia", "rate": 0.06, "special": "PRIVILEGE"},
		{"code": "WI", "name": "Wisconsin", "rate": 0.05},
		{"code": "WY", "name": "Wyoming", "rate": 0.04},
		{"code": "DC", "name": "District of Columbia", "rate": 0.06},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(states)
}

// getStateRules returns rules for a specific state
func (s *Server) getStateRules(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	code := vars["code"]

	// Simplified state rules response
	rules := map[string]interface{}{
		"stateCode":                 code,
		"tradeInPolicy":             map[string]interface{}{"type": "FULL"},
		"docFeeTaxable":             false,
		"taxOnAccessories":          true,
		"taxOnNegativeEquity":       false,
		"taxOnServiceContracts":     false,
		"taxOnGap":                  false,
		"vehicleUsesLocalSalesTax":  true,
	}

	// Add state-specific variations
	switch code {
	case "MI":
		rules["tradeInPolicy"] = map[string]interface{}{"type": "CAPPED", "capAmount": 3000}
	case "GA":
		rules["vehicleTaxScheme"] = "SPECIAL_TAVT"
		rules["extras"] = map[string]interface{}{
			"gaTAVT": map[string]interface{}{
				"defaultRate":                 0.066,
				"allowTradeInCredit":          true,
				"useHigherOfPriceOrAssessed": true,
			},
		}
	case "NC":
		rules["vehicleTaxScheme"] = "SPECIAL_HUT"
		rules["extras"] = map[string]interface{}{
			"ncHUT": map[string]interface{}{
				"baseRate":                0.03,
				"includeTradeInReduction": true,
				"maxReciprocityAgeDays":   90,
			},
		}
	case "SC":
		rules["taxCap"] = 500
	case "IN":
		rules["vehicleUsesLocalSalesTax"] = false
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}

// Start starts the Tax Service
func (s *Server) Start() error {
	log.Printf("Starting Tax Service on port %s", s.config.Port)
	return http.ListenAndServe(":"+s.config.Port, s.router)
}

func loadConfig() *Config {
	return &Config{
		Port:          getEnv("PORT", "8090"),
		WASMPath:      getEnv("WASM_PATH", ""),
		ServiceSecret: getEnv("SERVICE_SECRET", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	config := loadConfig()

	server, err := NewServer(config)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	if err := server.Start(); err != nil {
		log.Fatal(err)
	}
}
