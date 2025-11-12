import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, FileText, Plus } from 'lucide-react';

interface DealCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string;
  customerId?: string;
}

type UserType = {
  id: string;
  username: string;
  email: string | null;
  role: string;
};

export function DealCreationDialog({ open, onOpenChange, vehicleId, customerId }: DealCreationDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
    enabled: open, // Only load when dialog is open
  });
  
  const createDealMutation = useMutation({
    mutationFn: async (payload: { vehicleId?: string; customerId?: string }) => {
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const response = await apiRequest('POST', '/api/deals', {
        salespersonId: salesperson.id,
        ...payload,
      });
      return await response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
  
  const handleQuickQuote = () => {
    const params = new URLSearchParams();
    if (vehicleId) {
      // If we have vehicleId, we should fetch the vehicle price first
      // For now, just pass the vehicleId and let Quick Quote fetch it
      params.append('vehicleId', vehicleId);
    }
    onOpenChange(false);
    setLocation(`/quick-quote${params.toString() ? `?${params.toString()}` : ''}`);
  };
  
  const handleFullDesk = async () => {
    const payload: { vehicleId?: string; customerId?: string } = {};
    if (vehicleId) payload.vehicleId = vehicleId;
    if (customerId) payload.customerId = customerId;
    
    const deal = await createDealMutation.mutateAsync(payload);
    onOpenChange(false);
    toast({
      title: 'Deal created',
      description: 'Opening full desk worksheet...',
    });
    setLocation(`/deals/${deal.id}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-deal-creation">
        <DialogHeader>
          <DialogTitle>Start a New Deal</DialogTitle>
          <DialogDescription>
            Choose how you'd like to begin
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {/* Quick Quote Option */}
          <Card 
            className={`cursor-pointer hover-elevate active-elevate-2 transition-all ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={usersLoading ? undefined : handleQuickQuote}
            data-testid="card-quick-quote-option"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Quick Quote</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a payment estimate in 30 seconds with minimal inputs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Full Desk Option */}
          <Card 
            className={`cursor-pointer hover-elevate active-elevate-2 transition-all ${usersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={usersLoading ? undefined : handleFullDesk}
            data-testid="card-full-desk-option"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Full Desk Worksheet</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete deal structure with all fields, scenarios, and calculations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-deal-creation"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
