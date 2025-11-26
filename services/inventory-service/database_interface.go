package main

// Vehicle represents a vehicle in inventory
type Vehicle struct {
	ID           string  `json:"id"`
	DealershipID string  `json:"dealership_id"`
	VIN          string  `json:"vin"`
	StockNumber  string  `json:"stock_number"`
	Make         string  `json:"make"`
	Model        string  `json:"model"`
	Year         int     `json:"year"`
	Trim         string  `json:"trim"`
	Condition    string  `json:"condition"` // new, used, certified
	Status       string  `json:"status"`    // available, sold, pending
	Price        float64 `json:"price"`
	Mileage      int     `json:"mileage"`
	Color        string  `json:"color"`
	Transmission string  `json:"transmission"`
	Engine       string  `json:"engine"`
	FuelType     string  `json:"fuel_type"`
	DriveType    string  `json:"drive_type"`
	BodyStyle    string  `json:"body_style"`
	ImageURL     string  `json:"image_url"`
	Description  string  `json:"description"`
	Features     string  `json:"features"` // JSON array stored as string
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// VehicleDatabase defines the interface for vehicle database operations
type VehicleDatabase interface {
	Close() error
	InitSchema() error
	CreateVehicle(vehicle *Vehicle) error
	GetVehicle(id string) (*Vehicle, error)
	ListVehicles(dealershipID string, filters map[string]interface{}) ([]*Vehicle, error)
	UpdateVehicle(vehicle *Vehicle) error
	DeleteVehicle(id string) error
	ValidateVIN(vin string) (bool, error)
	GetInventoryStats(dealershipID string) (map[string]interface{}, error)
}
