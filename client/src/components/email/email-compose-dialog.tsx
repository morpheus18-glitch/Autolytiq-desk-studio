/**
 * Email Compose Dialog
 *
 * Clean UI for composing and sending emails through the secure backend
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Send, Save, Plus, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSendEmail, useSaveDraft, type EmailRecipient } from '@/hooks/use-email';
import { RichTextEditor } from './rich-text-editor';

import type { EmailMessage } from '@/hooks/use-email';

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultCc?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  quotedText?: string;
  customerId?: string;
  dealId?: string;
  draft?: EmailMessage | null;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  defaultTo,
  defaultCc,
  defaultSubject,
  defaultBody,
  quotedText,
  customerId,
  dealId,
  draft,
}: EmailComposeDialogProps) {
  // Form state
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [ccRecipients, setCcRecipients] = useState<EmailRecipient[]>([]);
  const [bccRecipients, setBccRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Mutations
  const sendEmail = useSendEmail();
  const saveDraft = useSaveDraft();

  // Initialize form with default values when dialog opens
  useEffect(() => {
    if (open) {
      // If there's a draft, load its data
      if (draft) {
        setDraftId(draft.id);

        // Set recipients from draft
        if (draft.toAddresses && draft.toAddresses.length > 0) {
          setRecipients(draft.toAddresses.map((addr: any) => ({
            email: addr.email || addr,
            name: addr.name
          })));
        }

        // Set Cc recipients from draft
        if (draft.ccAddresses && draft.ccAddresses.length > 0) {
          setCcRecipients(draft.ccAddresses.map((addr: any) => ({
            email: addr.email || addr,
            name: addr.name
          })));
          setShowCc(true);
        }

        // Set Bcc recipients from draft
        if (draft.bccAddresses && draft.bccAddresses.length > 0) {
          setBccRecipients(draft.bccAddresses.map((addr: any) => ({
            email: addr.email || addr,
            name: addr.name
          })));
          setShowBcc(true);
        }

        // Set subject and body from draft
        setSubject(draft.subject || '');
        setBody(draft.bodyHtml || draft.bodyText || '');
      } else {
        // Use default values if not a draft
        if (defaultTo) {
          setRecipients([{ email: defaultTo }]);
        }

        // Set Cc recipients
        if (defaultCc && defaultCc.length > 0) {
          setCcRecipients(defaultCc.map(email => ({ email })));
          setShowCc(true);
        }

        // Set subject
        if (defaultSubject) {
          setSubject(defaultSubject);
        }

        // Set body with quoted text if provided
        if (defaultBody) {
          setBody(defaultBody);
        } else if (quotedText) {
          setBody(`\n\n------- Original Message -------\n${quotedText}`);
        }
      }
    }
  }, [open, defaultTo, defaultCc, defaultSubject, defaultBody, quotedText, draft]);

  // Email validation
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Add recipient
  const addRecipient = (
    input: string,
    setInput: (v: string) => void,
    recipients: EmailRecipient[],
    setRecipients: (r: EmailRecipient[]) => void
  ) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setEmailError(`Invalid email address: ${trimmed}`);
      return;
    }

    setEmailError(null);
    setRecipients([...recipients, { email: trimmed }]);
    setInput('');
  };

  // Remove recipient
  const removeRecipient = (
    index: number,
    recipients: EmailRecipient[],
    setRecipients: (r: EmailRecipient[]) => void
  ) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  // Handle key press (Enter to add recipient)
  const handleKeyPress = (
    e: React.KeyboardEvent,
    input: string,
    setInput: (v: string) => void,
    recipients: EmailRecipient[],
    setRecipients: (r: EmailRecipient[]) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient(input, setInput, recipients, setRecipients);
    }
  };

  // Send email
  const handleSend = async () => {
    // Validate
    if (recipients.length === 0 && toInput.trim()) {
      addRecipient(toInput, setToInput, recipients, setRecipients);
      return;
    }

    if (recipients.length === 0) {
      setEmailError('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      setEmailError('Please add a subject');
      return;
    }

    if (!body.trim()) {
      setEmailError('Please write a message');
      return;
    }

    setEmailError(null);

    // Send
    await sendEmail.mutateAsync({
      to: recipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      bodyHtml: body, // Body is already HTML from rich text editor
      customerId,
      dealId,
    });

    // Close and reset
    onOpenChange(false);
    resetForm();
  };

  // Save as draft
  const handleSaveDraft = async () => {
    await saveDraft.mutateAsync({
      to: recipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      bodyHtml: body, // Body is already HTML from rich text editor
      customerId,
      dealId,
    });

    onOpenChange(false);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setToInput('');
    setCcInput('');
    setBccInput('');
    setRecipients([]);
    setCcRecipients([]);
    setBccRecipients([]);
    setSubject('');
    setBody('');
    setShowCc(false);
    setShowBcc(false);
    setEmailError(null);
    setDraftId(undefined);
    setLastSaved(null);
  };

  // Auto-save draft functionality
  const autoSaveDraft = useCallback(async () => {
    // Only auto-save if there's meaningful content
    if (!subject.trim() && !body.trim() && recipients.length === 0) {
      return;
    }

    try {
      const result = await saveDraft.mutateAsync({
        draftId,
        to: recipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        subject,
        bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        bodyHtml: body, // Body is already HTML from rich text editor
        customerId,
        dealId,
      });

      // Save the draft ID for future updates
      if (result && 'id' in result) {
        setDraftId(result.id);
      }
      setLastSaved(new Date());
    } catch (error) {
      // Silently fail auto-save - don't interrupt user
      console.error('Auto-save failed:', error);
    }
  }, [subject, body, recipients, ccRecipients, bccRecipients, draftId, customerId, dealId, saveDraft]);

  // Auto-save every 30 seconds when composing
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      autoSaveDraft();
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [open, subject, body, recipients, autoSaveDraft]);

  // Handle closing dialog - ask to save draft if content exists
  const handleClose = (shouldClose: boolean) => {
    if (!shouldClose) {
      onOpenChange(false);
      return;
    }

    // If there's unsaved content, auto-save before closing
    if ((subject.trim() || body.trim() || recipients.length > 0) && !draftId) {
      autoSaveDraft();
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New Message</DialogTitle>
            {lastSaved && (
              <p className="text-xs text-muted-foreground">
                Draft saved {new Date().getTime() - lastSaved.getTime() < 60000 ? 'just now' : 'at ' + lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Error Alert */}
          {emailError && (
            <Alert variant="destructive">
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
          )}

          {/* To Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="to">To</Label>
              <div className="flex gap-2">
                {!showCc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCc(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Cc
                  </Button>
                )}
                {!showBcc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBcc(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Bcc
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
              {recipients.map((recipient, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {recipient.email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(index, recipients, setRecipients)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                id="to"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) =>
                  handleKeyPress(e, toInput, setToInput, recipients, setRecipients)
                }
                onBlur={() => {
                  if (toInput.trim()) {
                    addRecipient(toInput, setToInput, recipients, setRecipients);
                  }
                }}
                placeholder="Enter email address"
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[200px]"
              />
            </div>
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className="space-y-2">
              <Label htmlFor="cc">Cc</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                {ccRecipients.map((recipient, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {recipient.email}
                    <button
                      type="button"
                      onClick={() =>
                        removeRecipient(index, ccRecipients, setCcRecipients)
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  id="cc"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyPress(e, ccInput, setCcInput, ccRecipients, setCcRecipients)
                  }
                  onBlur={() => {
                    if (ccInput.trim()) {
                      addRecipient(ccInput, setCcInput, ccRecipients, setCcRecipients);
                    }
                  }}
                  placeholder="Enter email address"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[200px]"
                />
              </div>
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="space-y-2">
              <Label htmlFor="bcc">Bcc</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                {bccRecipients.map((recipient, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {recipient.email}
                    <button
                      type="button"
                      onClick={() =>
                        removeRecipient(index, bccRecipients, setBccRecipients)
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  id="bcc"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyPress(
                      e,
                      bccInput,
                      setBccInput,
                      bccRecipients,
                      setBccRecipients
                    )
                  }
                  onBlur={() => {
                    if (bccInput.trim()) {
                      addRecipient(
                        bccInput,
                        setBccInput,
                        bccRecipients,
                        setBccRecipients
                      );
                    }
                  }}
                  placeholder="Enter email address"
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-[200px]"
                />
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="body">Message</Label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your message here..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraft.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sendEmail.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendEmail.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
