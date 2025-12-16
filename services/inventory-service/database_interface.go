package main

// Vehicle represents a vehicle in inventory
type Vehicle struct {
	ID             string   `json:"id"`
	DealershipID   string   `json:"dealership_id"`
	VIN            string   `json:"vin"`
	StockNumber    *string  `json:"stock_number,omitempty"`
	Make           string   `json:"make"`
	Model          string   `json:"model"`
	Year           int      `json:"year"`
	Trim           *string  `json:"trim,omitempty"`
	ExteriorColor  *string  `json:"exterior_color,omitempty"`
	InteriorColor  *string  `json:"interior_color,omitempty"`
	Mileage        int      `json:"mileage"`
	Condition      string   `json:"condition"` // new, used, certified
	Status         string   `json:"status"`    // available, sold, pending
	MSRP           *float64 `json:"msrp,omitempty"`
	Invoice        *float64 `json:"invoice,omitempty"`
	Cost           *float64 `json:"cost,omitempty"`
	AskingPrice    float64  `json:"asking_price"`
	InternetPrice  *float64 `json:"internet_price,omitempty"`
	Description    *string  `json:"description,omitempty"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
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
