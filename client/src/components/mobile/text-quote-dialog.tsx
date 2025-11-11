import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2 } from "lucide-react";
import { z } from "zod";

const phoneSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .regex(/^[\d\s\-\(\)\+]+$/, "Invalid phone number format");

const nameSchema = z.string()
  .min(2, "Name must be at least 2 characters");

interface TextQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendQuote: (name: string, phone: string) => Promise<void>;
}

export function TextQuoteDialog({ open, onOpenChange, onSendQuote }: TextQuoteDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const nameResult = nameSchema.safeParse(name);
    const phoneResult = phoneSchema.safeParse(phone);
    
    if (!nameResult.success || !phoneResult.success) {
      setErrors({
        name: nameResult.success ? undefined : nameResult.error.errors[0].message,
        phone: phoneResult.success ? undefined : phoneResult.error.errors[0].message,
      });
      return;
    }

    setErrors({});
    setIsSending(true);

    try {
      await onSendQuote(name, phone);
      // Reset form on success
      setName("");
      setPhone("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component via toast
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Text Quote to Customer
          </DialogTitle>
          <DialogDescription>
            Enter customer contact info to send payment quote via SMS
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSending}
              data-testid="input-customer-name"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone Number</Label>
            <Input
              id="customer-phone"
              type="tel"
              inputMode="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSending}
              data-testid="input-customer-phone"
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSending}
              data-testid="button-send-sms"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Send Text
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
