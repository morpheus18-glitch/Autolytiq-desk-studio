import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AutoSaveIndicator() {
  const { isSaving, lastSaved, saveError } = useStore();
  
  if (!isSaving && !lastSaved && !saveError) {
    return null;
  }
  
  // Ensure lastSaved is a valid Date object
  const lastSavedDate = lastSaved instanceof Date ? lastSaved : lastSaved ? new Date(lastSaved) : null;
  
  return (
    <div data-testid="autosave-indicator">
      {isSaving ? (
        <Badge variant="secondary" className="gap-2 shadow-lg" data-testid="badge-saving">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </Badge>
      ) : saveError ? (
        <Badge variant="destructive" className="gap-2 shadow-lg" data-testid="badge-error">
          <AlertCircle className="w-3 h-3" />
          Error - {saveError}
        </Badge>
      ) : lastSavedDate ? (
        <Badge variant="secondary" className="gap-2 shadow-lg bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20" data-testid="badge-saved">
          <Check className="w-3 h-3" />
          Saved {formatDistanceToNow(lastSavedDate, { addSuffix: true })}
        </Badge>
      ) : null}
    </div>
  );
}
