/**
 * Showroom Manager Page
 *
 * Real-time customer check-in and workflow tracking dashboard.
 * Displays active visits as cards with live timer updates.
 */

import { useState, useEffect, type JSX } from 'react';
import {
  Plus,
  Clock,
  User,
  Car,
  MessageSquare,
  ChevronRight,
  Play,
  Pause,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { Modal, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  useActiveVisits,
  useCreateVisit,
  useChangeVisitStatus,
  useStartTimer,
  useStopTimer,
} from '@/hooks/useShowroom';
import { useShowroomWebSocket } from '@/hooks/useShowroomWebSocket';
import { useCustomers } from '@/hooks/useCustomers';
import { cn, formatDate } from '@/lib/utils';
import type { Visit, VisitStatus, Timer, CreateVisitRequest } from '@/types/showroom';
import {
  VISIT_STATUS_CONFIG,
  getCustomerFullName,
  formatVehicleDescription,
  formatDuration,
  calculateTimerDuration,
  isClosedStatus,
} from '@/types/showroom';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: VisitStatus }): JSX.Element {
  const config = VISIT_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        config.bgColor,
        config.textColor
      )}
    >
      {config.label}
    </span>
  );
}

/**
 * Live timer display that updates every second
 */
function LiveTimer({ timer }: { timer: Timer }): JSX.Element {
  const [elapsed, setElapsed] = useState(calculateTimerDuration(timer));

  useEffect(() => {
    // Only update if timer is running
    if (timer.end_time) {
      setElapsed(timer.duration_seconds ?? 0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(calculateTimerDuration(timer));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  return <span className="font-mono text-sm font-medium">{formatDuration(elapsed)}</span>;
}

/**
 * Visit card component
 */
interface VisitCardProps {
  visit: Visit;
  onStatusChange: (status: VisitStatus) => void;
  onTimerToggle: () => void;
  onClick: () => void;
  isUpdating: boolean;
}

function VisitCard({
  visit,
  onStatusChange,
  onTimerToggle,
  onClick,
  isUpdating,
}: VisitCardProps): JSX.Element {
  const statusOrder: VisitStatus[] = [
    'CHECKED_IN',
    'BROWSING',
    'TEST_DRIVE',
    'NEGOTIATING',
    'PAPERWORK',
  ];
  const currentIndex = statusOrder.indexOf(visit.status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusOrder.length - 1
      ? statusOrder[currentIndex + 1]
      : null;

  const pinnedNote = visit.notes?.find((n) => n.is_pinned);
  const latestNote = visit.notes?.[0];
  const displayNote = pinnedNote || latestNote;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
        isUpdating && 'opacity-70'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{getCustomerFullName(visit.customer)}</h3>
            {visit.customer?.phone && (
              <p className="text-sm text-muted-foreground">{visit.customer.phone}</p>
            )}
          </div>
          <StatusBadge status={visit.status} />
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {visit.active_timer ? (
            <>
              <span className="text-sm text-muted-foreground">
                {visit.active_timer.timer_type.replace('_', ' ')}:
              </span>
              <LiveTimer timer={visit.active_timer} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTimerToggle();
                }}
                className="ml-auto p-1 rounded hover:bg-muted"
                title="Stop timer"
              >
                <Pause className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                Checked in {formatDate(visit.check_in_time)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTimerToggle();
                }}
                className="ml-auto p-1 rounded hover:bg-muted"
                title="Start timer"
              >
                <Play className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Vehicle */}
        {visit.vehicle && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>{formatVehicleDescription(visit.vehicle)}</span>
            {visit.stock_number && (
              <span className="text-muted-foreground">#{visit.stock_number}</span>
            )}
          </div>
        )}

        {/* Salesperson */}
        {visit.salesperson && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {visit.salesperson.first_name} {visit.salesperson.last_name}
            </span>
          </div>
        )}

        {/* Note preview */}
        {displayNote && (
          <div className="mb-3 p-2 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-2">{displayNote.content}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {nextStatus && !isClosedStatus(visit.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(nextStatus);
              }}
              disabled={isUpdating}
              className="flex-1"
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              {VISIT_STATUS_CONFIG[nextStatus].label}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClick}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Check-in modal component
 */
interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVisitRequest) => void;
  isLoading: boolean;
  customers: Array<{ id: string; name: string }>;
}

function CheckInModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  customers,
}: CheckInModalProps): JSX.Element {
  const [customerId, setCustomerId] = useState('');
  const [source, setSource] = useState<CreateVisitRequest['source']>('WALK_IN');
  const [initialNote, setInitialNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    onSubmit({
      customer_id: customerId,
      source,
      initial_note: initialNote || undefined,
    });
  };

  const handleClose = () => {
    setCustomerId('');
    setSource('WALK_IN');
    setInitialNote('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Check In Customer"
      description="Register a new showroom visit."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Customer *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-2 text-foreground"
            required
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as CreateVisitRequest['source'])}
            className="w-full rounded-lg border border-input bg-background p-2 text-foreground"
          >
            <option value="WALK_IN">Walk-In</option>
            <option value="APPOINTMENT">Appointment</option>
            <option value="INTERNET">Internet Lead</option>
            <option value="PHONE">Phone</option>
            <option value="REFERRAL">Referral</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Initial Note (optional)
          </label>
          <textarea
            value={initialNote}
            onChange={(e) => setInitialNote(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-2 text-foreground min-h-[80px]"
            placeholder="Add a note about this visit..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!customerId || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Check In
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Expanded visit modal component
 */
interface ExpandedVisitModalProps {
  visit: Visit | null;
  isOpen: boolean;
  onClose: () => void;
}

function ExpandedVisitModal({ visit, isOpen, onClose }: ExpandedVisitModalProps): JSX.Element {
  if (!visit) return <></>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Visit Details"
      description={`${getCustomerFullName(visit.customer)} - ${VISIT_STATUS_CONFIG[visit.status].label}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Customer info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{getCustomerFullName(visit.customer)}</p>
            {visit.customer?.email && (
              <p className="text-sm text-muted-foreground">{visit.customer.email}</p>
            )}
            {visit.customer?.phone && (
              <p className="text-sm text-muted-foreground">{visit.customer.phone}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge status={visit.status} />
          </div>
        </div>

        {/* Vehicle info */}
        {visit.vehicle && (
          <div>
            <p className="text-sm text-muted-foreground">Vehicle</p>
            <p className="font-medium">{formatVehicleDescription(visit.vehicle)}</p>
            {visit.stock_number && (
              <p className="text-sm text-muted-foreground">Stock #{visit.stock_number}</p>
            )}
          </div>
        )}

        {/* Salesperson */}
        {visit.salesperson && (
          <div>
            <p className="text-sm text-muted-foreground">Salesperson</p>
            <p className="font-medium">
              {visit.salesperson.first_name} {visit.salesperson.last_name}
            </p>
          </div>
        )}

        {/* Timers */}
        {visit.timers && visit.timers.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Activity Timers</p>
            <div className="space-y-2">
              {visit.timers.map((timer) => (
                <div
                  key={timer.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm">{timer.timer_type.replace('_', ' ')}</span>
                  <LiveTimer timer={timer} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {visit.notes && visit.notes.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Notes</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {visit.notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'p-2 rounded-lg bg-muted/30 border border-border/50',
                    note.is_pinned && 'border-primary/50'
                  )}
                >
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.created_by?.first_name} - {formatDate(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Check-in Time</p>
            <p>{formatDate(visit.check_in_time)}</p>
          </div>
          {visit.check_out_time && (
            <div>
              <p className="text-muted-foreground">Check-out Time</p>
              <p>{formatDate(visit.check_out_time)}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ isConnected }: { isConnected: boolean }): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
        isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Live
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onCheckIn }: { onCheckIn: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No Active Visits</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        There are no customers checked in right now. Check in a customer to get started.
      </p>
      <Button onClick={onCheckIn}>
        <Plus className="h-4 w-4 mr-2" />
        Check In Customer
      </Button>
    </div>
  );
}

/**
 * Main Showroom page component
 */
export function ShowroomPage(): JSX.Element {
  const toast = useToast();
  const { user } = useAuth();
  const dealershipId = user?.dealership_id ?? '';

  // UI state
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [expandedModalOpen, setExpandedModalOpen] = useState(false);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);

  // Data fetching
  const { data: visitsData, isLoading, error, refetch } = useActiveVisits();
  const { data: customersData } = useCustomers({ limit: 100 });

  // WebSocket connection
  const { isConnected } = useShowroomWebSocket({
    dealershipId,
    enabled: !!dealershipId,
  });

  // Mutations
  const createVisit = useCreateVisit();
  const changeStatus = useChangeVisitStatus();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const visits = visitsData?.visits ?? [];
  const customerOptions = (customersData?.customers ?? []).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
  }));

  // Handlers
  const handleCheckIn = async (data: CreateVisitRequest) => {
    try {
      await createVisit.mutateAsync(data);
      toast.success('Customer checked in', 'The customer has been checked in successfully.');
      setCheckInModalOpen(false);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to check in customer');
    }
  };

  const handleStatusChange = async (visitId: string, status: VisitStatus) => {
    setUpdatingVisitId(visitId);
    try {
      await changeStatus.mutateAsync({ id: visitId, status });
      toast.success(
        'Status updated',
        `Visit status changed to ${VISIT_STATUS_CONFIG[status].label}`
      );
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handleTimerToggle = async (visit: Visit) => {
    setUpdatingVisitId(visit.id);
    try {
      if (visit.active_timer) {
        await stopTimer.mutateAsync({
          visitId: visit.id,
          timerId: visit.active_timer.id,
        });
        toast.success('Timer stopped', 'The timer has been stopped.');
      } else {
        await startTimer.mutateAsync({
          visitId: visit.id,
          timerType: 'WAIT_TIME',
        });
        toast.success('Timer started', 'Wait time timer has been started.');
      }
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to toggle timer');
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handleVisitClick = (visit: Visit) => {
    setSelectedVisit(visit);
    setExpandedModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader
          title="Showroom"
          subtitle="Customer check-in and workflow tracking"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Showroom' }]}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <PageHeader
          title="Showroom"
          subtitle="Customer check-in and workflow tracking"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Showroom' }]}
        />
        <div className="py-12 text-center">
          <p className="text-destructive mb-4">Failed to load showroom data.</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Showroom"
        subtitle="Customer check-in and workflow tracking"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Showroom' }]}
        actions={
          <div className="flex items-center gap-3">
            <ConnectionStatus isConnected={isConnected} />
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCheckInModalOpen(true)}>
              Check In
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {visits.length === 0 ? (
          <EmptyState onCheckIn={() => setCheckInModalOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onStatusChange={(status) => handleStatusChange(visit.id, status)}
                onTimerToggle={() => handleTimerToggle(visit)}
                onClick={() => handleVisitClick(visit)}
                isUpdating={updatingVisitId === visit.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onSubmit={handleCheckIn}
        isLoading={createVisit.isPending}
        customers={customerOptions}
      />

      {/* Expanded Visit Modal */}
      <ExpandedVisitModal
        visit={selectedVisit}
        isOpen={expandedModalOpen}
        onClose={() => {
          setExpandedModalOpen(false);
          setSelectedVisit(null);
        }}
      />
    </MainLayout>
  );
}
