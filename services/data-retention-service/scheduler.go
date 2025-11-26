package main

import (
	"context"
	"sync"
	"time"

	"autolytiq/services/shared/logging"
)

// Scheduler manages scheduled background jobs
type Scheduler struct {
	retentionService *RetentionService
	gdprService      *GDPRService
	logger           *logging.Logger
	stopChan         chan struct{}
	wg               sync.WaitGroup
	running          bool
	mu               sync.Mutex
}

// NewScheduler creates a new scheduler
func NewScheduler(retentionService *RetentionService, gdprService *GDPRService, logger *logging.Logger) *Scheduler {
	return &Scheduler{
		retentionService: retentionService,
		gdprService:      gdprService,
		logger:           logger,
		stopChan:         make(chan struct{}),
	}
}

// Start starts all scheduled jobs
func (s *Scheduler) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	s.logger.Info("Starting scheduler for data retention jobs")

	// Daily retention cleanup job (runs at 2 AM)
	s.wg.Add(1)
	go s.runDailyJob("retention_cleanup", 2, 0, func(ctx context.Context) {
		result, err := s.retentionService.RunRetentionCleanup(ctx)
		if err != nil {
			s.logger.WithError(err).Error("Daily retention cleanup failed")
			return
		}
		s.logger.WithField("customers_processed", result.CustomersProcessed).
			WithField("customers_deleted", result.CustomersDeleted).
			WithField("customers_anonymized", result.CustomersAnonymized).
			Info("Daily retention cleanup completed")
	})

	// Weekly anonymization job (runs on Sunday at 3 AM)
	s.wg.Add(1)
	go s.runWeeklyJob("anonymization", time.Sunday, 3, 0, func(ctx context.Context) {
		result, err := s.gdprService.RunAnonymizationJob(ctx)
		if err != nil {
			s.logger.WithError(err).Error("Weekly anonymization job failed")
			return
		}
		s.logger.WithField("records_checked", result.RecordsChecked).
			WithField("records_anonymized", result.RecordsAnonymized).
			Info("Weekly anonymization job completed")
	})

	// Monthly retention report (runs on 1st of each month at 4 AM)
	s.wg.Add(1)
	go s.runMonthlyJob("retention_report", 1, 4, 0, func(ctx context.Context) {
		// Generate reports for all dealerships (empty string = all)
		report, err := s.retentionService.GenerateRetentionReport(ctx, "")
		if err != nil {
			s.logger.WithError(err).Error("Monthly retention report generation failed")
			return
		}
		s.logger.WithField("active_customers", report.Summary.ActiveCustomers).
			WithField("pending_gdpr_requests", report.Summary.PendingGDPRRequests).
			Info("Monthly retention report generated")
	})
}

// Stop stops all scheduled jobs
func (s *Scheduler) Stop() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	s.mu.Unlock()

	close(s.stopChan)
	s.wg.Wait()
	s.logger.Info("Scheduler stopped")
}

// runDailyJob runs a job daily at the specified hour and minute
func (s *Scheduler) runDailyJob(name string, hour, minute int, job func(context.Context)) {
	defer s.wg.Done()

	for {
		// Calculate next run time
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())
		if nextRun.Before(now) || nextRun.Equal(now) {
			nextRun = nextRun.Add(24 * time.Hour)
		}

		s.logger.WithField("job", name).
			WithField("next_run", nextRun.Format(time.RFC3339)).
			Debug("Scheduled daily job")

		select {
		case <-s.stopChan:
			s.logger.WithField("job", name).Debug("Daily job stopped")
			return
		case <-time.After(time.Until(nextRun)):
			s.logger.WithField("job", name).Info("Running scheduled daily job")
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
			job(ctx)
			cancel()
		}
	}
}

// runWeeklyJob runs a job weekly on the specified day at the specified hour and minute
func (s *Scheduler) runWeeklyJob(name string, day time.Weekday, hour, minute int, job func(context.Context)) {
	defer s.wg.Done()

	for {
		// Calculate next run time
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())

		// Find the next occurrence of the specified day
		daysUntil := int(day - nextRun.Weekday())
		if daysUntil < 0 {
			daysUntil += 7
		}
		if daysUntil == 0 && (nextRun.Before(now) || nextRun.Equal(now)) {
			daysUntil = 7
		}
		nextRun = nextRun.AddDate(0, 0, daysUntil)

		s.logger.WithField("job", name).
			WithField("next_run", nextRun.Format(time.RFC3339)).
			Debug("Scheduled weekly job")

		select {
		case <-s.stopChan:
			s.logger.WithField("job", name).Debug("Weekly job stopped")
			return
		case <-time.After(time.Until(nextRun)):
			s.logger.WithField("job", name).Info("Running scheduled weekly job")
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Hour)
			job(ctx)
			cancel()
		}
	}
}

// runMonthlyJob runs a job monthly on the specified day at the specified hour and minute
func (s *Scheduler) runMonthlyJob(name string, dayOfMonth, hour, minute int, job func(context.Context)) {
	defer s.wg.Done()

	for {
		// Calculate next run time
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), dayOfMonth, hour, minute, 0, 0, now.Location())

		// If we've passed this month's run date, schedule for next month
		if nextRun.Before(now) || nextRun.Equal(now) {
			nextRun = nextRun.AddDate(0, 1, 0)
		}

		// Handle months with fewer days
		if nextRun.Day() != dayOfMonth {
			// Go to last day of previous month
			nextRun = time.Date(nextRun.Year(), nextRun.Month(), 0, hour, minute, 0, 0, nextRun.Location())
		}

		s.logger.WithField("job", name).
			WithField("next_run", nextRun.Format(time.RFC3339)).
			Debug("Scheduled monthly job")

		select {
		case <-s.stopChan:
			s.logger.WithField("job", name).Debug("Monthly job stopped")
			return
		case <-time.After(time.Until(nextRun)):
			s.logger.WithField("job", name).Info("Running scheduled monthly job")
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
			job(ctx)
			cancel()
		}
	}
}

// RunJobNow runs a specific job immediately (for testing/manual triggers)
func (s *Scheduler) RunJobNow(ctx context.Context, jobName string) error {
	switch jobName {
	case "retention_cleanup":
		_, err := s.retentionService.RunRetentionCleanup(ctx)
		return err
	case "anonymization":
		_, err := s.gdprService.RunAnonymizationJob(ctx)
		return err
	case "retention_report":
		_, err := s.retentionService.GenerateRetentionReport(ctx, "")
		return err
	default:
		return nil
	}
}
