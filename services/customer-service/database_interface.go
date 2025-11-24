package main

// CustomerDatabase defines the interface for customer database operations
type CustomerDatabase interface {
	Close() error
	InitSchema() error
	CreateCustomer(customer *Customer) error
	GetCustomer(id string) (*Customer, error)
	ListCustomers(dealershipID string) ([]*Customer, error)
	UpdateCustomer(customer *Customer) error
	DeleteCustomer(id string) error
}
