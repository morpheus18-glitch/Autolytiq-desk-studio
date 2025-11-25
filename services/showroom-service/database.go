package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// VisitFilter contains filtering options for listing visits
type VisitFilter struct {
	DealershipID string
	Status       string
	ActiveOnly   bool
	DateFrom     *time.Time
	DateTo       *time.Time
	Limit        int
	Offset       int
}

// ShowroomDatabase defines the interface for database operations
type ShowroomDatabase interface {
	Close() error

	// Visits
	ListVisits(filter VisitFilter) ([]Visit, int, error)
	GetVisit(id, dealershipID string) (*Visit, error)
	CreateVisit(dealershipID string, req CreateVisitRequest) (*Visit, error)
	UpdateVisit(id, dealershipID string, req UpdateVisitRequest) (*Visit, error)
	ChangeStatus(id, dealershipID, status string) (*Visit, error)
	AttachVehicle(id, dealershipID, vehicleID string, stockNumber *string) (*Visit, error)
	CloseVisit(id, dealershipID, status string) (*Visit, error)

	// Timers
	GetTimers(visitID string) ([]Timer, error)
	StartTimer(visitID, timerType string, userID *string) (*Timer, error)
	StopTimer(timerID, visitID string) (*Timer, error)

	// Notes
	GetNotes(visitID string) ([]Note, error)
	CreateNote(visitID, userID string, req CreateNoteRequest) (*Note, error)
	UpdateNote(noteID, visitID string, req UpdateNoteRequest) (*Note, error)
	DeleteNote(noteID, visitID string) error

	// Events
	GetEvents(visitID string) ([]Event, error)
	CreateEvent(visitID, eventType string, userID, previousValue, newValue *string, metadata []byte) error

	// Workflow Config
	GetWorkflowConfig(dealershipID *string) (*WorkflowConfig, error)
	UpsertWorkflowConfig(config WorkflowConfig) (*WorkflowConfig, error)
}

// PostgresDB implements ShowroomDatabase
type PostgresDB struct {
	db *sql.DB
}

// NewPostgresDB creates a new PostgreSQL connection
func NewPostgresDB(connectionString string) (*PostgresDB, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &PostgresDB{db: db}, nil
}

// Close closes the database connection
func (p *PostgresDB) Close() error {
	return p.db.Close()
}

// ListVisits returns visits with filtering options
func (p *PostgresDB) ListVisits(filter VisitFilter) ([]Visit, int, error) {
	baseQuery := `
		FROM showroom_visits v
		LEFT JOIN customers c ON v.customer_id = c.id
		LEFT JOIN auth_users u ON v.salesperson_id = u.id
		LEFT JOIN vehicles ve ON v.vehicle_id = ve.id
		WHERE v.dealership_id = $1`

	args := []interface{}{filter.DealershipID}
	argNum := 2

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND v.status = $%d", argNum)
		args = append(args, filter.Status)
		argNum++
	}

	if filter.ActiveOnly {
		baseQuery += " AND v.check_out_time IS NULL AND v.status NOT IN ('CLOSED_WON', 'CLOSED_LOST')"
	}

	if filter.DateFrom != nil {
		baseQuery += fmt.Sprintf(" AND v.check_in_time >= $%d", argNum)
		args = append(args, *filter.DateFrom)
		argNum++
	}

	if filter.DateTo != nil {
		baseQuery += fmt.Sprintf(" AND v.check_in_time <= $%d", argNum)
		args = append(args, *filter.DateTo)
		argNum++
	}

	// Count total
	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	if err := p.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Select with pagination
	selectQuery := `
		SELECT v.id, v.dealership_id, v.customer_id, v.salesperson_id, v.vehicle_id,
		       v.stock_number, v.check_in_time, v.check_out_time, v.status, v.workflow_stage,
		       v.source, v.appointment_id, v.created_at, v.updated_at,
		       c.id, c.first_name, c.last_name, c.email, c.phone,
		       u.id, u.first_name, u.last_name, u.email,
		       ve.id, ve.stock_number, ve.year, ve.make, ve.model, ve.trim, ve.exterior_color, ve.list_price
		` + baseQuery + " ORDER BY v.check_in_time DESC"

	if filter.Limit > 0 {
		selectQuery += fmt.Sprintf(" LIMIT %d OFFSET %d", filter.Limit, filter.Offset)
	}

	rows, err := p.db.Query(selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	visits := []Visit{}
	for rows.Next() {
		v, err := p.scanVisitRow(rows)
		if err != nil {
			return nil, 0, err
		}
		visits = append(visits, *v)
	}

	return visits, total, nil
}

// scanVisitRow scans a visit row with all joins
func (p *PostgresDB) scanVisitRow(rows *sql.Rows) (*Visit, error) {
	var v Visit
	var customer CustomerInfo
	var salesperson UserInfo
	var vehicle VehicleInfo

	var salespersonID, vehicleID, stockNumber, source, appointmentID sql.NullString
	var checkOutTime sql.NullTime

	var custEmail, custPhone sql.NullString
	var spID, spFirstName, spLastName, spEmail sql.NullString
	var vehID, vehStockNum, vehTrim, vehColor sql.NullString
	var vehYear sql.NullInt64
	var vehMake, vehModel sql.NullString
	var vehPrice sql.NullFloat64

	err := rows.Scan(
		&v.ID, &v.DealershipID, &v.CustomerID, &salespersonID, &vehicleID,
		&stockNumber, &v.CheckInTime, &checkOutTime, &v.Status, &v.WorkflowStage,
		&source, &appointmentID, &v.CreatedAt, &v.UpdatedAt,
		&customer.ID, &customer.FirstName, &customer.LastName, &custEmail, &custPhone,
		&spID, &spFirstName, &spLastName, &spEmail,
		&vehID, &vehStockNum, &vehYear, &vehMake, &vehModel, &vehTrim, &vehColor, &vehPrice,
	)
	if err != nil {
		return nil, err
	}

	if salespersonID.Valid {
		v.SalespersonID = &salespersonID.String
	}
	if vehicleID.Valid {
		v.VehicleID = &vehicleID.String
	}
	if stockNumber.Valid {
		v.StockNumber = &stockNumber.String
	}
	if source.Valid {
		v.Source = &source.String
	}
	if appointmentID.Valid {
		v.AppointmentID = &appointmentID.String
	}
	if checkOutTime.Valid {
		v.CheckOutTime = &checkOutTime.Time
	}

	// Customer info
	if custEmail.Valid {
		customer.Email = &custEmail.String
	}
	if custPhone.Valid {
		customer.Phone = &custPhone.String
	}
	v.Customer = &customer

	// Salesperson info
	if spID.Valid {
		salesperson.ID = spID.String
		salesperson.FirstName = spFirstName.String
		salesperson.LastName = spLastName.String
		salesperson.Email = spEmail.String
		v.Salesperson = &salesperson
	}

	// Vehicle info
	if vehID.Valid {
		vehicle.ID = vehID.String
		if vehStockNum.Valid {
			vehicle.StockNumber = &vehStockNum.String
		}
		vehicle.Year = int(vehYear.Int64)
		vehicle.Make = vehMake.String
		vehicle.Model = vehModel.String
		if vehTrim.Valid {
			vehicle.Trim = &vehTrim.String
		}
		if vehColor.Valid {
			vehicle.ExteriorColor = &vehColor.String
		}
		vehicle.ListPrice = vehPrice.Float64
		v.Vehicle = &vehicle
	}

	return &v, nil
}

// GetVisit returns a single visit by ID with all related data
func (p *PostgresDB) GetVisit(id, dealershipID string) (*Visit, error) {
	query := `
		SELECT v.id, v.dealership_id, v.customer_id, v.salesperson_id, v.vehicle_id,
		       v.stock_number, v.check_in_time, v.check_out_time, v.status, v.workflow_stage,
		       v.source, v.appointment_id, v.created_at, v.updated_at,
		       c.id, c.first_name, c.last_name, c.email, c.phone,
		       u.id, u.first_name, u.last_name, u.email,
		       ve.id, ve.stock_number, ve.year, ve.make, ve.model, ve.trim, ve.exterior_color, ve.list_price
		FROM showroom_visits v
		LEFT JOIN customers c ON v.customer_id = c.id
		LEFT JOIN auth_users u ON v.salesperson_id = u.id
		LEFT JOIN vehicles ve ON v.vehicle_id = ve.id
		WHERE v.id = $1 AND v.dealership_id = $2`

	var v Visit
	var customer CustomerInfo
	var salesperson UserInfo
	var vehicle VehicleInfo

	var salespersonID, vehicleID, stockNumber, source, appointmentID sql.NullString
	var checkOutTime sql.NullTime
	var custEmail, custPhone sql.NullString
	var spID, spFirstName, spLastName, spEmail sql.NullString
	var vehID, vehStockNum, vehTrim, vehColor sql.NullString
	var vehYear sql.NullInt64
	var vehMake, vehModel sql.NullString
	var vehPrice sql.NullFloat64

	err := p.db.QueryRow(query, id, dealershipID).Scan(
		&v.ID, &v.DealershipID, &v.CustomerID, &salespersonID, &vehicleID,
		&stockNumber, &v.CheckInTime, &checkOutTime, &v.Status, &v.WorkflowStage,
		&source, &appointmentID, &v.CreatedAt, &v.UpdatedAt,
		&customer.ID, &customer.FirstName, &customer.LastName, &custEmail, &custPhone,
		&spID, &spFirstName, &spLastName, &spEmail,
		&vehID, &vehStockNum, &vehYear, &vehMake, &vehModel, &vehTrim, &vehColor, &vehPrice,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("visit not found")
	}
	if err != nil {
		return nil, err
	}

	if salespersonID.Valid {
		v.SalespersonID = &salespersonID.String
	}
	if vehicleID.Valid {
		v.VehicleID = &vehicleID.String
	}
	if stockNumber.Valid {
		v.StockNumber = &stockNumber.String
	}
	if source.Valid {
		v.Source = &source.String
	}
	if appointmentID.Valid {
		v.AppointmentID = &appointmentID.String
	}
	if checkOutTime.Valid {
		v.CheckOutTime = &checkOutTime.Time
	}

	if custEmail.Valid {
		customer.Email = &custEmail.String
	}
	if custPhone.Valid {
		customer.Phone = &custPhone.String
	}
	v.Customer = &customer

	if spID.Valid {
		salesperson.ID = spID.String
		salesperson.FirstName = spFirstName.String
		salesperson.LastName = spLastName.String
		salesperson.Email = spEmail.String
		v.Salesperson = &salesperson
	}

	if vehID.Valid {
		vehicle.ID = vehID.String
		if vehStockNum.Valid {
			vehicle.StockNumber = &vehStockNum.String
		}
		vehicle.Year = int(vehYear.Int64)
		vehicle.Make = vehMake.String
		vehicle.Model = vehModel.String
		if vehTrim.Valid {
			vehicle.Trim = &vehTrim.String
		}
		if vehColor.Valid {
			vehicle.ExteriorColor = &vehColor.String
		}
		vehicle.ListPrice = vehPrice.Float64
		v.Vehicle = &vehicle
	}

	// Get timers
	timers, _ := p.GetTimers(v.ID)
	v.Timers = timers
	for i := range timers {
		if timers[i].EndTime == nil {
			v.ActiveTimer = &timers[i]
			break
		}
	}

	// Get notes
	notes, _ := p.GetNotes(v.ID)
	v.Notes = notes

	return &v, nil
}

// CreateVisit inserts a new visit
func (p *PostgresDB) CreateVisit(dealershipID string, req CreateVisitRequest) (*Visit, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO showroom_visits (id, dealership_id, customer_id, salesperson_id, vehicle_id,
		                              stock_number, check_in_time, status, workflow_stage, source,
		                              created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := p.db.Exec(query,
		id, dealershipID, req.CustomerID, req.SalespersonID, req.VehicleID,
		req.StockNumber, now, "CHECKED_IN", 0, req.Source,
		now, now,
	)
	if err != nil {
		return nil, err
	}

	return p.GetVisit(id, dealershipID)
}

// UpdateVisit updates a visit
func (p *PostgresDB) UpdateVisit(id, dealershipID string, req UpdateVisitRequest) (*Visit, error) {
	// First verify visit exists
	_, err := p.GetVisit(id, dealershipID)
	if err != nil {
		return nil, err
	}

	query := `
		UPDATE showroom_visits
		SET salesperson_id = COALESCE($3, salesperson_id),
		    vehicle_id = COALESCE($4, vehicle_id),
		    stock_number = COALESCE($5, stock_number),
		    updated_at = $6
		WHERE id = $1 AND dealership_id = $2`

	_, err = p.db.Exec(query, id, dealershipID, req.SalespersonID, req.VehicleID, req.StockNumber, time.Now())
	if err != nil {
		return nil, err
	}

	return p.GetVisit(id, dealershipID)
}

// ChangeStatus changes the visit status
func (p *PostgresDB) ChangeStatus(id, dealershipID, status string) (*Visit, error) {
	workflowStage := getWorkflowStage(status)

	query := `
		UPDATE showroom_visits
		SET status = $3, workflow_stage = $4, updated_at = $5
		WHERE id = $1 AND dealership_id = $2`

	result, err := p.db.Exec(query, id, dealershipID, status, workflowStage, time.Now())
	if err != nil {
		return nil, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, errors.New("visit not found")
	}

	return p.GetVisit(id, dealershipID)
}

// AttachVehicle attaches a vehicle to a visit
func (p *PostgresDB) AttachVehicle(id, dealershipID, vehicleID string, stockNumber *string) (*Visit, error) {
	query := `
		UPDATE showroom_visits
		SET vehicle_id = $3, stock_number = $4, updated_at = $5
		WHERE id = $1 AND dealership_id = $2`

	result, err := p.db.Exec(query, id, dealershipID, vehicleID, stockNumber, time.Now())
	if err != nil {
		return nil, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, errors.New("visit not found")
	}

	return p.GetVisit(id, dealershipID)
}

// CloseVisit closes a visit with a final status
func (p *PostgresDB) CloseVisit(id, dealershipID, status string) (*Visit, error) {
	workflowStage := getWorkflowStage(status)
	now := time.Now()

	query := `
		UPDATE showroom_visits
		SET status = $3, workflow_stage = $4, check_out_time = $5, updated_at = $5
		WHERE id = $1 AND dealership_id = $2`

	result, err := p.db.Exec(query, id, dealershipID, status, workflowStage, now)
	if err != nil {
		return nil, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, errors.New("visit not found")
	}

	// Stop all active timers
	p.db.Exec(`
		UPDATE visit_timers
		SET end_time = $2, duration_seconds = EXTRACT(EPOCH FROM ($2 - start_time))::integer
		WHERE visit_id = $1 AND end_time IS NULL`, id, now)

	return p.GetVisit(id, dealershipID)
}

// GetTimers returns all timers for a visit
func (p *PostgresDB) GetTimers(visitID string) ([]Timer, error) {
	query := `
		SELECT id, visit_id, timer_type, start_time, end_time, duration_seconds, started_by, created_at
		FROM visit_timers
		WHERE visit_id = $1
		ORDER BY start_time DESC`

	rows, err := p.db.Query(query, visitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	timers := []Timer{}
	for rows.Next() {
		var t Timer
		var endTime sql.NullTime
		var durationSeconds sql.NullInt64
		var startedBy sql.NullString

		err := rows.Scan(&t.ID, &t.VisitID, &t.TimerType, &t.StartTime, &endTime, &durationSeconds, &startedBy, &t.CreatedAt)
		if err != nil {
			return nil, err
		}

		if endTime.Valid {
			t.EndTime = &endTime.Time
		}
		if durationSeconds.Valid {
			t.DurationSeconds = &durationSeconds.Int64
		}
		if startedBy.Valid {
			t.StartedBy = &startedBy.String
		}

		timers = append(timers, t)
	}

	return timers, nil
}

// StartTimer starts a new timer
func (p *PostgresDB) StartTimer(visitID, timerType string, userID *string) (*Timer, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO visit_timers (id, visit_id, timer_type, start_time, started_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := p.db.Exec(query, id, visitID, timerType, now, userID, now)
	if err != nil {
		return nil, err
	}

	return &Timer{
		ID:        id,
		VisitID:   visitID,
		TimerType: timerType,
		StartTime: now,
		StartedBy: userID,
		CreatedAt: now,
	}, nil
}

// StopTimer stops a timer
func (p *PostgresDB) StopTimer(timerID, visitID string) (*Timer, error) {
	now := time.Now()

	// Get start time to calculate duration
	var startTime time.Time
	err := p.db.QueryRow("SELECT start_time FROM visit_timers WHERE id = $1 AND visit_id = $2", timerID, visitID).Scan(&startTime)
	if err == sql.ErrNoRows {
		return nil, errors.New("timer not found")
	}
	if err != nil {
		return nil, err
	}

	duration := int64(now.Sub(startTime).Seconds())

	query := `UPDATE visit_timers SET end_time = $3, duration_seconds = $4 WHERE id = $1 AND visit_id = $2`
	_, err = p.db.Exec(query, timerID, visitID, now, duration)
	if err != nil {
		return nil, err
	}

	// Return updated timer
	var t Timer
	var startedBy sql.NullString
	err = p.db.QueryRow(`
		SELECT id, visit_id, timer_type, start_time, end_time, duration_seconds, started_by, created_at
		FROM visit_timers WHERE id = $1`, timerID).Scan(
		&t.ID, &t.VisitID, &t.TimerType, &t.StartTime, &t.EndTime, &t.DurationSeconds, &startedBy, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	if startedBy.Valid {
		t.StartedBy = &startedBy.String
	}

	return &t, nil
}

// GetNotes returns all notes for a visit
func (p *PostgresDB) GetNotes(visitID string) ([]Note, error) {
	query := `
		SELECT n.id, n.visit_id, n.created_by_id, n.content, n.is_pinned, n.created_at, n.updated_at,
		       u.id, u.first_name, u.last_name, u.email
		FROM visit_notes n
		LEFT JOIN auth_users u ON n.created_by_id = u.id
		WHERE n.visit_id = $1
		ORDER BY n.is_pinned DESC, n.created_at DESC`

	rows, err := p.db.Query(query, visitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notes := []Note{}
	for rows.Next() {
		var n Note
		var user UserInfo

		err := rows.Scan(
			&n.ID, &n.VisitID, &n.CreatedByID, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt,
			&user.ID, &user.FirstName, &user.LastName, &user.Email,
		)
		if err != nil {
			return nil, err
		}

		n.CreatedBy = &user
		notes = append(notes, n)
	}

	return notes, nil
}

// CreateNote creates a new note
func (p *PostgresDB) CreateNote(visitID, userID string, req CreateNoteRequest) (*Note, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO visit_notes (id, visit_id, created_by_id, content, is_pinned, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := p.db.Exec(query, id, visitID, userID, req.Content, req.IsPinned, now, now)
	if err != nil {
		return nil, err
	}

	// Fetch with user info
	var n Note
	var user UserInfo
	err = p.db.QueryRow(`
		SELECT n.id, n.visit_id, n.created_by_id, n.content, n.is_pinned, n.created_at, n.updated_at,
		       u.id, u.first_name, u.last_name, u.email
		FROM visit_notes n
		LEFT JOIN auth_users u ON n.created_by_id = u.id
		WHERE n.id = $1`, id).Scan(
		&n.ID, &n.VisitID, &n.CreatedByID, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt,
		&user.ID, &user.FirstName, &user.LastName, &user.Email,
	)
	if err != nil {
		return nil, err
	}
	n.CreatedBy = &user

	return &n, nil
}

// UpdateNote updates a note
func (p *PostgresDB) UpdateNote(noteID, visitID string, req UpdateNoteRequest) (*Note, error) {
	// Build dynamic update query
	query := "UPDATE visit_notes SET updated_at = $3"
	args := []interface{}{noteID, visitID, time.Now()}
	argNum := 4

	if req.Content != nil {
		query += fmt.Sprintf(", content = $%d", argNum)
		args = append(args, *req.Content)
		argNum++
	}
	if req.IsPinned != nil {
		query += fmt.Sprintf(", is_pinned = $%d", argNum)
		args = append(args, *req.IsPinned)
	}

	query += " WHERE id = $1 AND visit_id = $2"

	result, err := p.db.Exec(query, args...)
	if err != nil {
		return nil, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, errors.New("note not found")
	}

	// Fetch updated note
	var n Note
	var user UserInfo
	err = p.db.QueryRow(`
		SELECT n.id, n.visit_id, n.created_by_id, n.content, n.is_pinned, n.created_at, n.updated_at,
		       u.id, u.first_name, u.last_name, u.email
		FROM visit_notes n
		LEFT JOIN auth_users u ON n.created_by_id = u.id
		WHERE n.id = $1`, noteID).Scan(
		&n.ID, &n.VisitID, &n.CreatedByID, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt,
		&user.ID, &user.FirstName, &user.LastName, &user.Email,
	)
	if err != nil {
		return nil, err
	}
	n.CreatedBy = &user

	return &n, nil
}

// DeleteNote deletes a note
func (p *PostgresDB) DeleteNote(noteID, visitID string) error {
	result, err := p.db.Exec("DELETE FROM visit_notes WHERE id = $1 AND visit_id = $2", noteID, visitID)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("note not found")
	}

	return nil
}

// GetEvents returns all events for a visit
func (p *PostgresDB) GetEvents(visitID string) ([]Event, error) {
	query := `
		SELECT id, visit_id, event_type, user_id, previous_value, new_value, metadata, created_at
		FROM visit_events
		WHERE visit_id = $1
		ORDER BY created_at DESC`

	rows, err := p.db.Query(query, visitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		var userID, prevVal, newVal sql.NullString
		var metadata []byte

		err := rows.Scan(&e.ID, &e.VisitID, &e.EventType, &userID, &prevVal, &newVal, &metadata, &e.CreatedAt)
		if err != nil {
			return nil, err
		}

		if userID.Valid {
			e.UserID = &userID.String
		}
		if prevVal.Valid {
			e.PreviousValue = &prevVal.String
		}
		if newVal.Valid {
			e.NewValue = &newVal.String
		}
		if metadata != nil {
			e.Metadata = metadata
		}

		events = append(events, e)
	}

	return events, nil
}

// CreateEvent creates a new event
func (p *PostgresDB) CreateEvent(visitID, eventType string, userID, previousValue, newValue *string, metadata []byte) error {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO visit_events (id, visit_id, event_type, user_id, previous_value, new_value, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := p.db.Exec(query, id, visitID, eventType, userID, previousValue, newValue, metadata, now)
	return err
}

// GetWorkflowConfig returns the workflow config for a dealership or default
func (p *PostgresDB) GetWorkflowConfig(dealershipID *string) (*WorkflowConfig, error) {
	var config WorkflowConfig
	var dealerID sql.NullString

	query := `
		SELECT id, dealership_id, name, stages, auto_triggers, is_default, created_at, updated_at
		FROM workflow_configs
		WHERE (dealership_id = $1 OR (dealership_id IS NULL AND is_default = true))
		ORDER BY dealership_id DESC NULLS LAST
		LIMIT 1`

	err := p.db.QueryRow(query, dealershipID).Scan(
		&config.ID, &dealerID, &config.Name, &config.Stages, &config.AutoTriggers,
		&config.IsDefault, &config.CreatedAt, &config.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if dealerID.Valid {
		config.DealershipID = &dealerID.String
	}

	return &config, nil
}

// UpsertWorkflowConfig updates or creates a workflow config
func (p *PostgresDB) UpsertWorkflowConfig(config WorkflowConfig) (*WorkflowConfig, error) {
	now := time.Now()

	stagesJSON, err := json.Marshal(config.Stages)
	if err != nil {
		return nil, err
	}

	triggersJSON, err := json.Marshal(config.AutoTriggers)
	if err != nil {
		return nil, err
	}

	if config.ID == "" {
		config.ID = uuid.New().String()
		config.CreatedAt = now
	}
	config.UpdatedAt = now

	query := `
		INSERT INTO workflow_configs (id, dealership_id, name, stages, auto_triggers, is_default, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (dealership_id, name) DO UPDATE
		SET stages = $4, auto_triggers = $5, updated_at = $8`

	_, err = p.db.Exec(query, config.ID, config.DealershipID, config.Name, stagesJSON, triggersJSON, config.IsDefault, config.CreatedAt, config.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return &config, nil
}

// Helper function to get workflow stage number from status
func getWorkflowStage(status string) int {
	stages := map[string]int{
		"CHECKED_IN":  0,
		"BROWSING":    1,
		"TEST_DRIVE":  2,
		"NEGOTIATING": 3,
		"PAPERWORK":   4,
		"CLOSED_WON":  5,
		"CLOSED_LOST": 6,
	}
	if stage, ok := stages[status]; ok {
		return stage
	}
	return 0
}
