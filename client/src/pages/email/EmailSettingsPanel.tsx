/**
 * Email Settings Panel
 *
 * Slide-out panel for managing email settings:
 * - Signatures (create, edit, delete, set default)
 * - Labels (create, edit colors, delete)
 * - General email preferences
 */

import { useState, type JSX } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import {
  useEmailSignatures,
  useCreateSignature,
  useUpdateSignature,
  useDeleteSignature,
  useEmailLabels,
  useCreateLabel,
  useDeleteLabel,
  useEmailPreferences,
  useUpdateEmailPreferences,
  DEFAULT_EMAIL_PREFERENCES,
  type EmailSignature,
  type EmailLabel,
  type EmailPreferences,
  type ReadingPanePosition,
} from '@/hooks/useEmail';
import { Button } from '@design-system';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Tag,
  FileText,
  Settings,
  Loader2,
  Star,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface EmailSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dealershipId: string;
  userId: string;
}

type SettingsTab = 'signatures' | 'labels' | 'preferences';

// =====================================================
// COLOR PICKER
// =====================================================

const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={cn(
            'w-6 h-6 rounded-full transition-all',
            value === color && 'ring-2 ring-offset-2 ring-primary'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// =====================================================
// SIGNATURE EDITOR
// =====================================================

interface SignatureEditorProps {
  signature?: EmailSignature;
  onSave: (name: string, html: string, isDefault: boolean) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function SignatureEditor({
  signature,
  onSave,
  onCancel,
  isSaving,
}: SignatureEditorProps): JSX.Element {
  const [name, setName] = useState(signature?.name || '');
  const [isDefault, setIsDefault] = useState(signature?.is_default || false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: signature?.signature_html || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[100px] p-3',
      },
    },
  });

  const handleSave = () => {
    if (!name.trim() || !editor) return;
    onSave(name, editor.getHTML(), isDefault);
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-foreground">Signature Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Work, Personal"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Editor */}
      <div>
        <label className="text-sm font-medium text-foreground">Signature Content</label>
        <div className="mt-1 border border-input rounded-lg overflow-hidden">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Default checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-input"
        />
        <span className="text-sm text-foreground">Set as default signature</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!name.trim()}>
          Save Signature
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// SIGNATURE LIST ITEM
// =====================================================

function SignatureListItem({
  signature,
  onEdit,
  onDelete,
  isDeleting,
}: {
  signature: EmailSignature;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{signature.name}</span>
            {signature.is_default && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(signature.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-background text-muted-foreground"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 rounded hover:bg-background text-destructive disabled:opacity-50"
          title="Delete"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// LABEL EDITOR
// =====================================================

interface LabelEditorProps {
  label?: EmailLabel;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function LabelEditor({ label, onSave, onCancel, isSaving }: LabelEditorProps): JSX.Element {
  const [name, setName] = useState(label?.name || '');
  const [color, setColor] = useState(label?.color || LABEL_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, color);
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-foreground">Label Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Important, Follow-up"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Color */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Label Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Preview */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Preview</label>
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Tag className="h-3 w-3" />
          {name || 'Label name'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!name.trim()}>
          Save Label
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// LABEL LIST ITEM
// =====================================================

function LabelListItem({
  label,
  onDelete,
  isDeleting,
}: {
  label: EmailLabel;
  onDelete: () => void;
  isDeleting: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${label.color}20` }}
        >
          <Tag className="h-4 w-4" style={{ color: label.color }} />
        </div>
        <div>
          <span className="font-medium text-sm">{label.name}</span>
          <p className="text-xs text-muted-foreground">
            Created {new Date(label.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="p-1.5 rounded hover:bg-background text-destructive disabled:opacity-50"
        title="Delete"
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// =====================================================
// SIGNATURES TAB
// =====================================================

function SignaturesTab({
  dealershipId,
  userId,
}: {
  dealershipId: string;
  userId: string;
}): JSX.Element {
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: signatures = [], isLoading } = useEmailSignatures(dealershipId, userId);
  const createMutation = useCreateSignature();
  const updateMutation = useUpdateSignature();
  const deleteMutation = useDeleteSignature();

  const handleCreate = async (name: string, html: string, isDefault: boolean) => {
    await createMutation.mutateAsync({
      dealership_id: dealershipId,
      user_id: userId,
      name,
      signature_html: html,
      is_default: isDefault,
    });
    setIsCreating(false);
  };

  const handleUpdate = async (name: string, html: string, isDefault: boolean) => {
    if (!editingSignature) return;
    await updateMutation.mutateAsync({
      id: editingSignature.id,
      data: {
        dealership_id: dealershipId,
        user_id: userId,
        name,
        signature_html: html,
        is_default: isDefault,
      },
    });
    setEditingSignature(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id, dealershipId, userId });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCreating || editingSignature) {
    return (
      <SignatureEditor
        signature={editingSignature || undefined}
        onSave={editingSignature ? handleUpdate : handleCreate}
        onCancel={() => {
          setIsCreating(false);
          setEditingSignature(null);
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create signatures to use in your emails
        </p>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreating(true)}
        >
          New Signature
        </Button>
      </div>

      {signatures.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No signatures yet</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setIsCreating(true)}
          >
            Create your first signature
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {signatures.map((sig) => (
            <SignatureListItem
              key={sig.id}
              signature={sig}
              onEdit={() => setEditingSignature(sig)}
              onDelete={() => handleDelete(sig.id)}
              isDeleting={deletingId === sig.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// LABELS TAB
// =====================================================

function LabelsTab({
  dealershipId,
  userId,
}: {
  dealershipId: string;
  userId: string;
}): JSX.Element {
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: labels = [], isLoading } = useEmailLabels(dealershipId, userId);
  const createMutation = useCreateLabel();
  const deleteMutation = useDeleteLabel();

  const handleCreate = async (name: string, color: string) => {
    await createMutation.mutateAsync({
      dealership_id: dealershipId,
      user_id: userId,
      name,
      color,
    });
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id, dealershipId, userId });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isCreating) {
    return (
      <LabelEditor
        onSave={handleCreate}
        onCancel={() => setIsCreating(false)}
        isSaving={createMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize your emails with custom labels
        </p>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreating(true)}
        >
          New Label
        </Button>
      </div>

      {labels.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No labels yet</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setIsCreating(true)}
          >
            Create your first label
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <LabelListItem
              key={label.id}
              label={label}
              onDelete={() => handleDelete(label.id)}
              isDeleting={deletingId === label.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// PREFERENCES TAB
// =====================================================

function PreferencesTab({
  dealershipId,
  userId,
}: {
  dealershipId: string;
  userId: string;
}): JSX.Element {
  const { data: preferences, isLoading } = useEmailPreferences(dealershipId, userId);
  const updateMutation = useUpdateEmailPreferences();

  // Use preferences or defaults
  const currentPrefs = preferences || {
    ...DEFAULT_EMAIL_PREFERENCES,
    id: '',
    dealership_id: dealershipId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleUpdatePreference = <K extends keyof EmailPreferences>(
    key: K,
    value: EmailPreferences[K]
  ) => {
    updateMutation.mutate({
      dealershipId,
      userId,
      preferences: { [key]: value },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reading Pane */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Reading Pane</h4>
        <div className="space-y-2">
          {(['right', 'bottom', 'hidden'] as ReadingPanePosition[]).map((position) => (
            <label key={position} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reading-pane"
                checked={currentPrefs.reading_pane_position === position}
                onChange={() => handleUpdatePreference('reading_pane_position', position)}
                className="text-primary"
              />
              <span className="text-sm">
                {position === 'right'
                  ? 'Show on right (default)'
                  : position === 'bottom'
                    ? 'Show at bottom'
                    : 'Hidden'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Conversation View */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Conversation View</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPrefs.conversation_view}
            onChange={(e) => handleUpdatePreference('conversation_view', e.target.checked)}
            className="rounded text-primary"
          />
          <span className="text-sm">Group emails by conversation</span>
        </label>
      </div>

      {/* Desktop Notifications */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Notifications</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPrefs.desktop_notifications}
            onChange={(e) => handleUpdatePreference('desktop_notifications', e.target.checked)}
            className="rounded text-primary"
          />
          <span className="text-sm">Desktop notifications for new emails</span>
        </label>
      </div>

      {/* Auto-Advance */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">After Deleting/Archiving</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPrefs.auto_advance}
            onChange={(e) => handleUpdatePreference('auto_advance', e.target.checked)}
            className="rounded text-primary"
          />
          <span className="text-sm">Automatically open next email</span>
        </label>
      </div>

      {/* Density */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Display Density</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="density"
              checked={currentPrefs.density === 'comfortable'}
              onChange={() => handleUpdatePreference('density', 'comfortable')}
              className="text-primary"
            />
            <span className="text-sm">Comfortable (more spacing)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="density"
              checked={currentPrefs.density === 'compact'}
              onChange={() => handleUpdatePreference('density', 'compact')}
              className="text-primary"
            />
            <span className="text-sm">Compact (more emails visible)</span>
          </label>
        </div>
      </div>

      {/* Swipe Actions (Mobile) */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Swipe Actions (Mobile)</h4>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Swipe left</span>
            <select
              value={currentPrefs.swipe_left_action}
              onChange={(e) =>
                handleUpdatePreference('swipe_left_action', e.target.value as 'archive' | 'delete' | 'mark_read')
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="delete">Delete</option>
              <option value="archive">Archive</option>
              <option value="mark_read">Mark as read</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Swipe right</span>
            <select
              value={currentPrefs.swipe_right_action}
              onChange={(e) =>
                handleUpdatePreference('swipe_right_action', e.target.value as 'archive' | 'delete' | 'mark_read')
              }
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="archive">Archive</option>
              <option value="delete">Delete</option>
              <option value="mark_read">Mark as read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stars */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Stars</h4>
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          <span className="text-sm text-muted-foreground">
            Star important emails for quick access
          </span>
        </div>
      </div>

      {/* Save indicator */}
      {updateMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </div>
      )}
      {updateMutation.isSuccess && (
        <div className="text-xs text-green-600">
          ✓ Preferences saved
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function EmailSettingsPanel({
  isOpen,
  onClose,
  dealershipId,
  userId,
}: EmailSettingsPanelProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<SettingsTab>('signatures');

  if (!isOpen) return null;

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof FileText }> = [
    { id: 'signatures', label: 'Signatures', icon: FileText },
    { id: 'labels', label: 'Labels', icon: Tag },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Email Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'signatures' && (
            <SignaturesTab dealershipId={dealershipId} userId={userId} />
          )}
          {activeTab === 'labels' && (
            <LabelsTab dealershipId={dealershipId} userId={userId} />
          )}
          {activeTab === 'preferences' && (
            <PreferencesTab dealershipId={dealershipId} userId={userId} />
          )}
        </div>
      </div>
    </>
  );
}
