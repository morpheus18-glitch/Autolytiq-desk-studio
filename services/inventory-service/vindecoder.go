package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// VINDecoderService handles VIN decoding via NHTSA vPIC API
type VINDecoderService struct {
	baseURL    string
	httpClient *http.Client
}

// NewVINDecoderService creates a new VIN decoder service instance
func NewVINDecoderService() *VINDecoderService {
	return &VINDecoderService{
		baseURL: "https://vpic.nhtsa.dot.gov/api",
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// NHTSAResponse represents the response from NHTSA vPIC API
type NHTSAResponse struct {
	Count          int                      `json:"Count"`
	Message        string                   `json:"Message"`
	SearchCriteria string                   `json:"SearchCriteria"`
	Results        []map[string]interface{} `json:"Results"`
}

// DecodedVehicleInfo represents the decoded vehicle information
type DecodedVehicleInfo struct {
	VIN               string `json:"vin"`
	Year              int    `json:"year"`
	Make              string `json:"make"`
	Model             string `json:"model"`
	Trim              string `json:"trim"`
	BodyClass         string `json:"body_class"`
	DriveType         string `json:"drive_type"`
	EngineModel       string `json:"engine_model"`
	EngineCylinders   string `json:"engine_cylinders"`
	EngineDisplacement string `json:"engine_displacement"`
	FuelType          string `json:"fuel_type"`
	Transmission      string `json:"transmission"`
	Doors             string `json:"doors"`
	VehicleType       string `json:"vehicle_type"`
	PlantCountry      string `json:"plant_country"`
	PlantCity         string `json:"plant_city"`
	Manufacturer      string `json:"manufacturer"`
	ErrorCode         string `json:"error_code,omitempty"`
	ErrorText         string `json:"error_text,omitempty"`
}

// DecodeVINRequest represents the request to decode a VIN
type DecodeVINRequest struct {
	VIN string `json:"vin"`
}

// Validate validates the DecodeVINRequest
func (r *DecodeVINRequest) Validate() *ValidationErrors {
	var errors []ValidationError

	if r.VIN == "" {
		errors = append(errors, ValidationError{
			Field:   "vin",
			Message: "VIN is required",
		})
	} else if len(r.VIN) != 17 {
		errors = append(errors, ValidationError{
			Field:   "vin",
			Message: "VIN must be exactly 17 characters",
		})
	} else {
		// Check for invalid characters
		r.VIN = strings.ToUpper(r.VIN)
		if strings.ContainsAny(r.VIN, "IOQ") {
			errors = append(errors, ValidationError{
				Field:   "vin",
				Message: "VIN cannot contain letters I, O, or Q",
			})
		}
	}

	if len(errors) > 0 {
		return &ValidationErrors{Errors: errors}
	}
	return nil
}

// Sanitize sanitizes the DecodeVINRequest
func (r *DecodeVINRequest) Sanitize() {
	r.VIN = strings.TrimSpace(strings.ToUpper(r.VIN))
}

// DecodeVIN decodes a VIN using the NHTSA vPIC API
func (s *VINDecoderService) DecodeVIN(vin string) (*DecodedVehicleInfo, error) {
	vin = strings.TrimSpace(strings.ToUpper(vin))

	// Construct the API URL
	url := fmt.Sprintf("%s/vehicles/DecodeVinValues/%s?format=json", s.baseURL, vin)

	// Make the request
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call NHTSA API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("NHTSA API returned status %d", resp.StatusCode)
	}

	// Read and parse the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read NHTSA response: %w", err)
	}

	var nhtsa NHTSAResponse
	if err := json.Unmarshal(body, &nhtsa); err != nil {
		return nil, fmt.Errorf("failed to parse NHTSA response: %w", err)
	}

	if len(nhtsa.Results) == 0 {
		return nil, fmt.Errorf("no results returned from NHTSA API")
	}

	// Extract the vehicle information
	result := nhtsa.Results[0]
	info := &DecodedVehicleInfo{
		VIN: vin,
	}

	// Extract year
	if yearVal, ok := result["ModelYear"].(string); ok && yearVal != "" {
		var year int
		fmt.Sscanf(yearVal, "%d", &year)
		info.Year = year
	}

	// Extract make
	if makeVal, ok := result["Make"].(string); ok {
		info.Make = makeVal
	}

	// Extract model
	if modelVal, ok := result["Model"].(string); ok {
		info.Model = modelVal
	}

	// Extract trim
	if trimVal, ok := result["Trim"].(string); ok {
		info.Trim = trimVal
	}

	// Extract body class
	if bodyVal, ok := result["BodyClass"].(string); ok {
		info.BodyClass = bodyVal
	}

	// Extract drive type
	if driveVal, ok := result["DriveType"].(string); ok {
		info.DriveType = driveVal
	}

	// Extract engine model
	if engineVal, ok := result["EngineModel"].(string); ok {
		info.EngineModel = engineVal
	}

	// Extract engine cylinders
	if cylindersVal, ok := result["EngineCylinders"].(string); ok {
		info.EngineCylinders = cylindersVal
	}

	// Extract engine displacement
	if displacementVal, ok := result["DisplacementL"].(string); ok && displacementVal != "" {
		info.EngineDisplacement = displacementVal + "L"
	}

	// Extract fuel type
	if fuelVal, ok := result["FuelTypePrimary"].(string); ok {
		info.FuelType = fuelVal
	}

	// Extract transmission
	if transVal, ok := result["TransmissionStyle"].(string); ok {
		info.Transmission = transVal
	}

	// Extract doors
	if doorsVal, ok := result["Doors"].(string); ok {
		info.Doors = doorsVal
	}

	// Extract vehicle type
	if typeVal, ok := result["VehicleType"].(string); ok {
		info.VehicleType = typeVal
	}

	// Extract plant country
	if countryVal, ok := result["PlantCountry"].(string); ok {
		info.PlantCountry = countryVal
	}

	// Extract plant city
	if cityVal, ok := result["PlantCity"].(string); ok {
		info.PlantCity = cityVal
	}

	// Extract manufacturer
	if mfgVal, ok := result["Manufacturer"].(string); ok {
		info.Manufacturer = mfgVal
	}

	// Check for error codes from NHTSA
	if errorCode, ok := result["ErrorCode"].(string); ok && errorCode != "0" {
		info.ErrorCode = errorCode
		if errorText, ok := result["ErrorText"].(string); ok {
			info.ErrorText = errorText
		}
	}

	return info, nil
}

// decodeVINHandler handles VIN decoding requests
func (s *Server) decodeVINHandler(w http.ResponseWriter, r *http.Request) {
	var req DecodeVINRequest
	if !decodeAndValidate(r, w, &req) {
		return
	}

	// Create decoder service
	decoder := NewVINDecoderService()

	// Decode the VIN
	info, err := decoder.DecodeVIN(req.VIN)
	if err != nil {
		s.logger.WithContext(r.Context()).WithError(err).Error("Failed to decode VIN")
		respondErrorJSON(w, http.StatusBadGateway, "Failed to decode VIN: "+err.Error(), "VIN_DECODE_ERROR")
		return
	}

	// Check if NHTSA reported errors
	if info.ErrorCode != "" && info.ErrorCode != "0" {
		// Return partial data with warning
		w.Header().Set("X-VIN-Warning", info.ErrorText)
	}

	s.logger.WithContext(r.Context()).WithField("vin", req.VIN).Info("VIN decoded successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(info)
}
