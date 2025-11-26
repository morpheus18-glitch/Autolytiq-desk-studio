package metrics

import (
	"database/sql"
	"time"
)

// DBStatsCollector collects database connection pool statistics
type DBStatsCollector struct {
	metrics  *Metrics
	db       *sql.DB
	interval time.Duration
	stopCh   chan struct{}
}

// NewDBStatsCollector creates a new database stats collector
func NewDBStatsCollector(m *Metrics, db *sql.DB, interval time.Duration) *DBStatsCollector {
	if interval == 0 {
		interval = 15 * time.Second
	}
	return &DBStatsCollector{
		metrics:  m,
		db:       db,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins collecting database stats at the configured interval
func (c *DBStatsCollector) Start() {
	go func() {
		ticker := time.NewTicker(c.interval)
		defer ticker.Stop()

		// Collect immediately on start
		c.collect()

		for {
			select {
			case <-ticker.C:
				c.collect()
			case <-c.stopCh:
				return
			}
		}
	}()
}

// Stop stops the database stats collector
func (c *DBStatsCollector) Stop() {
	close(c.stopCh)
}

func (c *DBStatsCollector) collect() {
	stats := c.db.Stats()
	c.metrics.UpdateDBPoolStats(
		stats.MaxOpenConnections,
		stats.InUse,
		stats.Idle,
	)
}

// DBQueryTimer is a helper for timing database queries
type DBQueryTimer struct {
	metrics   *Metrics
	operation string
	table     string
	start     time.Time
}

// NewDBQueryTimer creates a new query timer
func (m *Metrics) NewDBQueryTimer(operation, table string) *DBQueryTimer {
	return &DBQueryTimer{
		metrics:   m,
		operation: operation,
		table:     table,
		start:     time.Now(),
	}
}

// Done records the query duration
func (t *DBQueryTimer) Done() {
	t.metrics.RecordDBQuery(t.operation, t.table, time.Since(t.start))
}

// ObserveQuery is a convenience function to time and record a database query
// Usage: defer metrics.ObserveQuery("select", "users")()
func (m *Metrics) ObserveQuery(operation, table string) func() {
	start := time.Now()
	return func() {
		m.RecordDBQuery(operation, table, time.Since(start))
	}
}
