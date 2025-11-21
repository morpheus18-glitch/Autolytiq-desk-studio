/**
 * Email Compose Component
 *
 * Mobile-first email composition form styled like Gmail/Outlook.
 * Features:
 * - To/CC/BCC fields
 * - Subject line
 * - Rich text or plain text body
 * - Auto-save drafts
 * - Customer/deal linking
 * - Send/discard actions
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Send,
  Save,
  Paperclip,
  ChevronDown,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailComposeProps {
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    id: string;
    subject: string;
    fromAddress: string;
  };
  customerId?: string;
  dealId?: string;
  className?: string;
}

export function EmailCompose({
  onClose,
  onSent,
  replyTo,
  customerId,
  dealId,
  className,
}: EmailComposeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : ""
  );
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [linkedCustomerId, setLinkedCustomerId] = useState(customerId);
  const [linkedDealId, setLinkedDealId] = useState(dealId);
  const [draftId, setDraftId] = useState<string | undefined>();

  // Auto-fill reply-to address
  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.fromAddress);
    }
  }, [replyTo]);

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const toAddresses = to
        .split(",")
        .map((email) => ({ email: email.trim() }));
      const ccAddresses = cc
        ? cc.split(",").map((email) => ({ email: email.trim() }))
        : [];
      const bccAddresses = bcc
        ? bcc.split(",").map((email) => ({ email: email.trim() }))
        : [];

      const response = await apiRequest("POST", "/api/email/send", {
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
        subject,
        bodyText: body,
        bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
        customerId: linkedCustomerId,
        dealId: linkedDealId,
      });

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
      onSent?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const toAddresses = to
        ? to.split(",").map((email) => ({ email: email.trim() }))
        : [];

      const response = await apiRequest("POST", "/api/email/drafts", {
        draftId,
        to: toAddresses.length > 0 ? toAddresses : undefined,
        subject: subject || undefined,
        bodyText: body || undefined,
        bodyHtml: body ? `<p>${body.replace(/\n/g, "<br>")}</p>` : undefined,
        customerId: linkedCustomerId,
        dealId: linkedDealId,
      });

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.data?.id) {
        setDraftId(data.data.id);
      }
      toast({
        title: "Draft saved",
        description: "Your draft has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save draft",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!to && !subject && !body) return; // Don't save empty drafts

    const timer = setTimeout(() => {
      saveDraftMutation.mutate();
    }, 30000);

    return () => clearTimeout(timer);
  }, [to, subject, body]);

  const handleSend = () => {
    if (!to.trim()) {
      toast({
        title: "Recipients required",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please add a subject line.",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate();
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate();
  };

  const handleDiscard = () => {
    if (
      (to || subject || body) &&
      !confirm("Discard this draft?")
    ) {
      return;
    }
    onClose();
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden",
        "h-full md:h-auto md:max-h-[80vh]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <h3 className="font-semibold">
          {replyTo ? "Reply" : "New Message"}
        </h3>
        <Button size="icon" variant="ghost" onClick={handleDiscard}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {/* To field */}
          <div className="flex items-center gap-2 border-b pb-2">
            <Label htmlFor="to" className="text-sm text-muted-foreground w-12">
              To
            </Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none focus-visible:ring-0 px-0"
              multiple
            />
            <div className="flex gap-1">
              {!showCc && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCc(true)}
                  className="text-xs"
                >
                  Cc
                </Button>
              )}
              {!showBcc && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBcc(true)}
                  className="text-xs"
                >
                  Bcc
                </Button>
              )}
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Label htmlFor="cc" className="text-sm text-muted-foreground w-12">
                Cc
              </Label>
              <Input
                id="cc"
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="border-0 shadow-none focus-visible:ring-0 px-0"
                multiple
              />
            </div>
          )}

          {/* BCC field */}
          {showBcc && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Label htmlFor="bcc" className="text-sm text-muted-foreground w-12">
                Bcc
              </Label>
              <Input
                id="bcc"
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="border-0 shadow-none focus-visible:ring-0 px-0"
                multiple
              />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 border-b pb-2">
            <Label htmlFor="subject" className="text-sm text-muted-foreground w-12">
              Subject
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-0 shadow-none focus-visible:ring-0 px-0"
            />
          </div>

          {/* Linked items */}
          {(linkedCustomerId || linkedDealId) && (
            <div className="flex gap-2 flex-wrap">
              {linkedCustomerId && (
                <Badge variant="secondary" className="gap-1">
                  <User className="w-3 h-3" />
                  Customer Linked
                  <button
                    onClick={() => setLinkedCustomerId(undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {linkedDealId && (
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="w-3 h-3" />
                  Deal Linked
                  <button
                    onClick={() => setLinkedDealId(undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Body */}
          <div className="pt-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="min-h-[200px] md:min-h-[300px] border-0 shadow-none focus-visible:ring-0 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
        <div className="flex gap-2">
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="icon" variant="ghost" title="Attach file">
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Draft indicator */}
      {draftId && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-xs text-blue-700 dark:text-blue-300 border-t">
          Draft saved automatically
        </div>
      )}
    </div>
  );
}
