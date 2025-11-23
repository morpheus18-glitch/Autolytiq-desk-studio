import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function AutoSaveIndicator() {
  const { isSaving, lastSaved, saveError } = useStore();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showCheckmarkBounce, setShowCheckmarkBounce] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string>('');
  const lastSavedRef = useRef<Date | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  
  // Ensure lastSaved is a valid Date object
  const lastSavedDate = lastSaved instanceof Date ? lastSaved : lastSaved ? new Date(lastSaved) : null;
  
  // Trigger success animation only on state change (not every render)
  useEffect(() => {
    if (lastSavedDate && lastSavedRef.current?.getTime() !== lastSavedDate.getTime()) {
      setShowSuccessAnimation(true);
      setShowCheckmarkBounce(true);
      lastSavedRef.current = lastSavedDate;
      
      // Fade in the badge
      const fadeTimer = setTimeout(() => setShowSuccessAnimation(false), 400);
      // Bounce the checkmark
      const bounceTimer = setTimeout(() => setShowCheckmarkBounce(false), 600);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(bounceTimer);
      };
    }
  }, [lastSavedDate]);
  
  // Real-time relative time updates
  useEffect(() => {
    if (!lastSavedDate) {
      setRelativeTime('');
      return;
    }
    
    // Update immediately
    const updateRelativeTime = () => {
      setRelativeTime(formatDistanceToNow(lastSavedDate, { addSuffix: true }));
    };
    
    updateRelativeTime();
    
    // Update every 10 seconds for fresh timestamps
    const interval = setInterval(updateRelativeTime, 10000);
    return () => clearInterval(interval);
  }, [lastSavedDate]);
  
  // Trigger error animation only on state change
  useEffect(() => {
    if (saveError && lastErrorRef.current !== saveError) {
      setShowErrorAnimation(true);
      lastErrorRef.current = saveError;
      const timer = setTimeout(() => setShowErrorAnimation(false), 400);
      return () => clearTimeout(timer);
    }
  }, [saveError]);
  
  if (!isSaving && !lastSaved && !saveError) {
    return null;
  }
  
  return (
    <div data-testid="autosave-indicator" className="transition-all duration-300">
      {isSaving ? (
        <Badge
          variant="secondary"
          className={cn("gap-2 fade-in", "shadow-lg")}
          data-testid="badge-saving"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </Badge>
      ) : saveError ? (
        <Badge
          variant="destructive"
          className={cn("gap-2", "shadow-lg", showErrorAnimation && "shake-error")}
          data-testid="badge-error"
        >
          <AlertCircle className="w-3 h-3" />
          {saveError}
        </Badge>
      ) : lastSavedDate && relativeTime ? (
        <Badge
          variant="outline"
          className={cn(
            "gap-2 border-success/30 bg-success/5",
            "shadow-sm",
            showSuccessAnimation && "fade-in"
          )}
          data-testid="badge-saved"
        >
          <Check
            className={cn(
              "w-3 h-3 text-success",
              showCheckmarkBounce && "checkmark-bounce"
            )}
          />
          <span className="text-success font-medium">Saved</span>
          <span className="text-muted-foreground">{relativeTime}</span>
        </Badge>
      ) : null}
    </div>
  );
}
