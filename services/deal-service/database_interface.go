package main

// DealDatabase defines the interface for deal database operations
type DealDatabase interface {
	Close() error
	InitSchema() error
	CreateDeal(deal *Deal) error
	GetDeal(id string) (*Deal, error)
	ListDeals(dealershipID string) ([]*Deal, error)
	UpdateDeal(deal *Deal) error
	DeleteDeal(id string) error
}
