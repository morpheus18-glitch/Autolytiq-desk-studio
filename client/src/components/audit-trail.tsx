import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Clock, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { AuditLog, User } from '@shared/schema';

interface AuditTrailProps {
  dealId: string;
  onClose: () => void;
}

interface AuditLogWithUser extends AuditLog {
  user: User;
}

export function AuditTrail({ dealId, onClose }: AuditTrailProps) {
  const { data: logs, isLoading } = useQuery<AuditLogWithUser[]>({
    queryKey: ['/api/deals', dealId, 'audit'],
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Audit Trail</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete history of all changes
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-audit">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No audit history yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-4 relative">
                  {/* Timeline line */}
                  {index < logs.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                  )}
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative z-10">
                    <UserIcon className="w-5 h-5 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium">{log.user.fullName}</div>
                      <Badge variant="secondary" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        {log.entityType} • {log.fieldName || 'General'}
                      </div>
                      
                      {log.oldValue && log.newValue && (
                        <div className="p-2 bg-muted/50 rounded text-xs font-mono space-y-1">
                          <div className="text-destructive">
                            - {log.oldValue}
                          </div>
                          <div className="text-green-600 dark:text-green-400">
                            + {log.newValue}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.timestamp), 'MMM dd, yyyy • h:mm:ss.SSS a')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
