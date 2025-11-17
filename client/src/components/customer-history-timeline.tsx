import { useEffect, useState } from 'react';
import { Calendar, FileText, UserPlus, Car } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';

interface HistoryEvent {
  type: 'deal' | 'customer_created' | 'email' | 'quote';
  timestamp: string;
  data: any;
}

interface CustomerHistoryTimelineProps {
  customerId: string;
}

export function CustomerHistoryTimeline({ customerId }: CustomerHistoryTimelineProps) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}/history`);
        if (!response.ok) {
          throw new Error('Failed to fetch customer history');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchHistory();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">No activity history found</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'deal':
        return <Car className="w-5 h-5" />;
      case 'customer_created':
        return <UserPlus className="w-5 h-5" />;
      case 'email':
        return <FileText className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'deal':
        return 'bg-blue-500';
      case 'customer_created':
        return 'bg-green-500';
      case 'email':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTitle = (event: HistoryEvent) => {
    switch (event.type) {
      case 'deal':
        return `Deal ${event.data.dealNumber || 'Created'}`;
      case 'customer_created':
        return 'Customer Created';
      case 'email':
        return 'Email Sent';
      default:
        return 'Activity';
    }
  };

  const getEventDescription = (event: HistoryEvent) => {
    switch (event.type) {
      case 'deal':
        if (event.data.vehicle) {
          return `${event.data.vehicle.year} ${event.data.vehicle.make} ${event.data.vehicle.model}`;
        }
        return 'Vehicle deal';
      case 'customer_created':
        return `${event.data.name} was added to the system`;
      default:
        return '';
    }
  };

  const getDealStateColor = (state: string) => {
    switch (state) {
      case 'APPROVED':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'DRAFT':
        return 'outline';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        {history.map((event, index) => (
          <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            {index < history.length - 1 && (
              <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${getEventColor(
                event.type
              )} text-white flex-shrink-0`}
            >
              {getEventIcon(event.type)}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{getEventTitle(event)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getEventDescription(event)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.timestamp), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Additional info for deals */}
              {event.type === 'deal' && event.data.dealState && (
                <div className="flex gap-2">
                  <Badge variant={getDealStateColor(event.data.dealState)}>
                    {event.data.dealState.replace('_', ' ')}
                  </Badge>
                  {event.data.vehicle?.stockNumber && (
                    <Badge variant="outline">
                      Stock: {event.data.vehicle.stockNumber}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
