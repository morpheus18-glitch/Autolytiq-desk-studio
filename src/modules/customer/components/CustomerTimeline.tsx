/**
 * CUSTOMER TIMELINE COMPONENT
 * Displays customer activity timeline (deals, emails, interactions)
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerTimeline } from '../hooks/useCustomer';
import { formatDateTime, formatDate } from '../utils/formatters';
import {
  FileText,
  Mail,
  Phone,
  Calendar,
  Car,
  MessageSquare,
  Activity,
} from 'lucide-react';
import type { TimelineEvent } from '../types/customer.types';

interface CustomerTimelineProps {
  customerId: string;
}

const eventIcons = {
  deal: FileText,
  email: Mail,
  call: Phone,
  appointment: Calendar,
  'test-drive': Car,
  note: MessageSquare,
  other: Activity,
};

const eventColors = {
  deal: 'bg-blue-100 text-blue-700',
  email: 'bg-green-100 text-green-700',
  call: 'bg-purple-100 text-purple-700',
  appointment: 'bg-yellow-100 text-yellow-700',
  'test-drive': 'bg-red-100 text-red-700',
  note: 'bg-gray-100 text-gray-700',
  other: 'bg-slate-100 text-slate-700',
};

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const { data: events, isLoading, error } = useCustomerTimeline(customerId);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Error loading timeline: {error.message}
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm mt-1">
            Customer timeline will appear here as interactions occur
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = eventIcons[event.type] || Activity;
        const colorClass = eventColors[event.type] || eventColors.other;

        return (
          <Card key={event.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${colorClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <time className="text-sm text-muted-foreground">
                      {formatDateTime(event.date)}
                    </time>
                  </div>

                  {/* Metadata */}
                  {event.metadata && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(event.metadata).map(([key, value]) => {
                        if (typeof value === 'string' || typeof value === 'number') {
                          return (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline connector (not on last item) */}
              {index < events.length - 1 && (
                <div className="ml-5 mt-2 mb-2 h-6 w-px bg-border" />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
