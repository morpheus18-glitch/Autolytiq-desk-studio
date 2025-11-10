import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

export function AutoSaveIndicator() {
  const { isSaving, lastSaved, saveError } = useStore();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const lastSavedRef = useRef<Date | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  
  // Ensure lastSaved is a valid Date object
  const lastSavedDate = lastSaved instanceof Date ? lastSaved : lastSaved ? new Date(lastSaved) : null;
  
  // Trigger success animation only on state change (not every render)
  useEffect(() => {
    if (lastSavedDate && lastSavedRef.current?.getTime() !== lastSavedDate.getTime()) {
      setShowSuccessAnimation(true);
      lastSavedRef.current = lastSavedDate;
      const timer = setTimeout(() => setShowSuccessAnimation(false), 250);
      return () => clearTimeout(timer);
    }
  }, [lastSavedDate]);
  
  // Trigger error animation only on state change
  useEffect(() => {
    if (saveError && lastErrorRef.current !== saveError) {
      setShowErrorAnimation(true);
      lastErrorRef.current = saveError;
      const timer = setTimeout(() => setShowErrorAnimation(false), 300);
      return () => clearTimeout(timer);
    }
  }, [saveError]);
  
  if (!isSaving && !lastSaved && !saveError) {
    return null;
  }
  
  return (
    <div data-testid="autosave-indicator">
      {isSaving ? (
        <Badge variant="secondary" className="gap-2 shadow-lg" data-testid="badge-saving">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </Badge>
      ) : saveError ? (
        <Badge 
          variant="destructive" 
          className={`gap-2 shadow-lg ${showErrorAnimation ? 'shake-error' : ''}`}
          data-testid="badge-error"
        >
          <AlertCircle className="w-3 h-3" />
          Error - {saveError}
        </Badge>
      ) : lastSavedDate ? (
        <Badge 
          variant="outline" 
          className={`gap-2 shadow-lg ${showSuccessAnimation ? 'scale-in' : ''}`}
          data-testid="badge-saved"
        >
          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
          Saved {formatDistanceToNow(lastSavedDate, { addSuffix: true })}
        </Badge>
      ) : null}
    </div>
  );
}
