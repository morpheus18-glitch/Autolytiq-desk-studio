/**
 * Compose Modal
 *
 * Full-featured email composition modal with:
 * - TipTap rich text editor
 * - To/CC/BCC recipient fields
 * - Attachment uploads
 * - Signature selection
 * - Template insertion
 * - Auto-save drafts
 * - Reply/Forward modes
 */

import { useState, useEffect, useRef, type JSX } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import {
  useComposeEmail,
  useEmailSignatures,
  useUploadAttachment,
  type EmailSignature,
  type EmailAttachment,
} from '@/hooks/useEmail';
import { type ComposeContext } from './hooks';
import { Button } from '@design-system';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Paperclip,
  Link as LinkIcon,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  ChevronDown,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: ComposeContext | null;
  dealershipId: string;
  userId: string;
  /** Mobile viewport - renders full-screen modal */
  isMobile?: boolean;
}

interface RecipientInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  label: string;
}

// =====================================================
// EDITOR TOOLBAR
// =====================================================

function EditorToolbar({ editor }: { editor: Editor | null }): JSX.Element | null {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('bold') && 'bg-muted text-primary'
        )}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('italic') && 'bg-muted text-primary'
        )}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('bulletList') && 'bg-muted text-primary'
        )}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('orderedList') && 'bg-muted text-primary'
        )}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('blockquote') && 'bg-muted text-primary'
        )}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </button>

      <div className="w-px h-4 bg-border mx-1" />

      <button
        onClick={() => {
          const url = window.prompt('Enter link URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={cn(
          'p-1.5 rounded hover:bg-muted',
          editor.isActive('link') && 'bg-muted text-primary'
        )}
        title="Insert Link"
      >
        <LinkIcon className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  );
}

// =====================================================
// RECIPIENT INPUT
// =====================================================

function RecipientInput({ value, onChange, placeholder, label }: RecipientInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && !value.includes(trimmed) && trimmed.includes('@')) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeEmail = (email: string) => {
    onChange(value.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue) {
      addEmail(inputValue);
    }
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border">
      <span className="text-sm text-muted-foreground w-10 pt-1">{label}</span>
      <div
        className="flex-1 flex flex-wrap items-center gap-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-sm"
          >
            {email}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

// =====================================================
// ATTACHMENT ITEM
// =====================================================

function AttachmentItem({
  file,
  onRemove,
  isUploading,
}: {
  file: File | EmailAttachment;
  onRemove: () => void;
  isUploading?: boolean;
}): JSX.Element {
  // Type guard to check if file is a File (not EmailAttachment)
  const isFile = (f: File | EmailAttachment): f is File => 'name' in f && !('filename' in f);

  const name = isFile(file) ? file.name : file.filename;
  const size = file.size;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 group">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(size)}</p>
      </div>
      {isUploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// =====================================================
// SIGNATURE DROPDOWN
// =====================================================

function SignatureDropdown({
  signatures,
  selectedId,
  onSelect,
}: {
  signatures: EmailSignature[];
  selectedId: string | null;
  onSelect: (signature: EmailSignature | null) => void;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSignature = signatures.find((s) => s.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded"
      >
        <FileText className="h-3.5 w-3.5" />
        {selectedSignature?.name || 'No signature'}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 z-50 w-48 rounded-lg bg-popover border border-border shadow-lg py-1">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-muted',
                !selectedId && 'bg-muted'
              )}
            >
              No signature
            </button>
            {signatures.map((sig) => (
              <button
                key={sig.id}
                onClick={() => {
                  onSelect(sig);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-muted',
                  selectedId === sig.id && 'bg-muted'
                )}
              >
                {sig.name}
                {sig.is_default && (
                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// COMPOSE MODAL
// =====================================================

export function ComposeModal({
  isOpen,
  onClose,
  context,
  dealershipId,
  userId,
  isMobile = false,
}: ComposeModalProps): JSX.Element | null {
  // State
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<(File | EmailAttachment)[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);

  // Hooks
  const { data: signatures = [] } = useEmailSignatures(dealershipId, userId);
  const composeMutation = useComposeEmail();
  const uploadMutation = useUploadAttachment();

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your message...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px]',
      },
    },
  });

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from context (reply/forward)
  useEffect(() => {
    if (!context || !isOpen) return;

    if (context.mode === 'reply' && context.inReplyTo) {
      setTo([context.inReplyTo.from]);
      setSubject(
        context.inReplyTo.subject.startsWith('Re:')
          ? context.inReplyTo.subject
          : `Re: ${context.inReplyTo.subject}`
      );
      editor?.commands.setContent(buildReplyContent(context.inReplyTo));
    } else if (context.mode === 'replyAll' && context.inReplyTo) {
      setTo([context.inReplyTo.from]);
      if (context.inReplyTo.to) {
        setCc(context.inReplyTo.to.filter((e) => e !== context.inReplyTo?.from));
        setShowCc(true);
      }
      setSubject(
        context.inReplyTo.subject.startsWith('Re:')
          ? context.inReplyTo.subject
          : `Re: ${context.inReplyTo.subject}`
      );
      editor?.commands.setContent(buildReplyContent(context.inReplyTo));
    } else if (context.mode === 'forward' && context.inReplyTo) {
      setSubject(
        context.inReplyTo.subject.startsWith('Fwd:')
          ? context.inReplyTo.subject
          : `Fwd: ${context.inReplyTo.subject}`
      );
      editor?.commands.setContent(buildForwardContent(context.inReplyTo));
    }

    // Set default signature
    const defaultSig = signatures.find((s) => s.is_default);
    if (defaultSig) {
      setSelectedSignatureId(defaultSig.id);
    }
  }, [context, isOpen, editor, signatures]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setShowCc(false);
      setShowBcc(false);
      setAttachments([]);
      setUploadingFiles(new Set());
      setIsMinimized(false);
      setSelectedSignatureId(null);
      editor?.commands.clearContent();
    }
  }, [isOpen, editor]);

  // Build reply content
  const buildReplyContent = (original: ComposeContext['inReplyTo']) => {
    if (!original) return '';
    return `
      <br><br>
      <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
        <p>On ${new Date(original.date).toLocaleString()}, ${original.fromName || original.from} wrote:</p>
        ${original.bodyHtml}
      </div>
    `;
  };

  // Build forward content
  const buildForwardContent = (original: ComposeContext['inReplyTo']) => {
    if (!original) return '';
    return `
      <br><br>
      <div>
        <p>---------- Forwarded message ----------</p>
        <p>From: ${original.fromName || original.from}</p>
        <p>Date: ${new Date(original.date).toLocaleString()}</p>
        <p>Subject: ${original.subject}</p>
        <p>To: ${original.to?.join(', ') || ''}</p>
        <br>
        ${original.bodyHtml}
      </div>
    `;
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const fileId = `${file.name}-${Date.now()}`;
      setUploadingFiles((prev) => new Set(prev).add(fileId));
      setAttachments((prev) => [...prev, file]);

      try {
        // Upload attachment
        const uploaded = await uploadMutation.mutateAsync({
          dealershipId,
          file,
        });

        // Replace File with EmailAttachment
        setAttachments((prev) =>
          prev.map((a) => (a === file ? uploaded : a))
        );
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        // Remove failed file
        setAttachments((prev) => prev.filter((a) => a !== file));
      } finally {
        setUploadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle send
  const handleSend = async () => {
    if (to.length === 0) return;

    // Get editor content
    let bodyHtml = editor?.getHTML() || '';

    // Append signature if selected
    const signature = signatures.find((s) => s.id === selectedSignatureId);
    if (signature) {
      bodyHtml += `<br><br>${signature.signature_html}`;
    }

    try {
      await composeMutation.mutateAsync({
        dealership_id: dealershipId,
        user_id: userId,
        to,
        cc: showCc ? cc : undefined,
        bcc: showBcc ? bcc : undefined,
        subject,
        body_html: bodyHtml,
        reply_to: context?.inReplyTo?.id,
        thread_id: context?.inReplyTo?.threadId,
        attachments: attachments
          .filter((a): a is EmailAttachment => 'id' in a)
          .map((a) => a.id),
      });

      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  // Handle signature change
  const handleSignatureChange = (signature: EmailSignature | null) => {
    setSelectedSignatureId(signature?.id || null);
  };

  if (!isOpen) return null;

  // Modal size classes - mobile gets full screen, desktop gets floating panel
  const modalSizeClasses = isMobile
    ? 'inset-0 rounded-none' // Full screen on mobile
    : isMaximized
      ? 'inset-4 rounded-xl'
      : isMinimized
        ? 'bottom-0 right-4 w-80 h-12 rounded-t-lg'
        : 'bottom-0 right-4 w-[600px] max-w-[calc(100vw-2rem)] max-h-[80vh] rounded-t-xl';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed z-50 bg-background border border-border shadow-2xl flex flex-col',
          modalSizeClasses,
          isMobile && 'border-0' // No border on mobile full screen
        )}
      >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50',
          isMinimized && 'cursor-pointer'
        )}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <h3 className="text-sm font-medium text-foreground">
          {context?.mode === 'reply'
            ? 'Reply'
            : context?.mode === 'replyAll'
              ? 'Reply All'
              : context?.mode === 'forward'
                ? 'Forward'
                : 'New Message'}
        </h3>
        <div className="flex items-center gap-1">
          {/* Hide minimize/maximize on mobile - we use full screen */}
          {!isMobile && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                  setIsMaximized(false);
                }}
                className="p-1.5 rounded hover:bg-muted"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaximized(!isMaximized);
                  setIsMinimized(false);
                }}
                className="p-1.5 rounded hover:bg-muted"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded hover:bg-muted"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content (hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Recipients */}
          <RecipientInput
            value={to}
            onChange={setTo}
            placeholder="Recipients"
            label="To"
          />

          {showCc && (
            <RecipientInput
              value={cc}
              onChange={setCc}
              placeholder="Cc recipients"
              label="Cc"
            />
          )}

          {showBcc && (
            <RecipientInput
              value={bcc}
              onChange={setBcc}
              placeholder="Bcc recipients"
              label="Bcc"
            />
          )}

          {/* CC/BCC toggles */}
          {(!showCc || !showBcc) && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Bcc
                </button>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="px-3 py-2 border-b border-border">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Toolbar */}
          <EditorToolbar editor={editor} />

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4">
            <EditorContent editor={editor} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <AttachmentItem
                    key={'id' in file ? file.id : `file-${index}`}
                    file={file}
                    onRemove={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    isUploading={uploadingFiles.has(`${'name' in file ? file.name : file.filename}-${index}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleSend}
                loading={composeMutation.isPending}
                disabled={to.length === 0}
                icon={<Send className="h-4 w-4" />}
              >
                Send
              </Button>

              {/* Attachment button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <SignatureDropdown
                signatures={signatures}
                selectedId={selectedSignatureId}
                onSelect={handleSignatureChange}
              />

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-destructive"
                title="Discard"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}
