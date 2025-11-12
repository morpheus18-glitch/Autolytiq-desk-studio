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
  
  const handleQuickBuild = () => {
    const params = new URLSearchParams();
    params.append('mode', 'quick');
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (customerId) params.append('customerId', customerId);
    
    onOpenChange(false);
    setLocation(`/deals/new?${params.toString()}`);
  };
  
  const handleFullBuild = () => {
    const params = new URLSearchParams();
    params.append('mode', 'full');
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (customerId) params.append('customerId', customerId);
    
    onOpenChange(false);
    setLocation(`/deals/new?${params.toString()}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-deal-creation">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Deal Studio
          </DialogTitle>
          <DialogDescription>
            Choose your workflow to structure deals with speed and precision
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {/* Deal Studio - Quick Build */}
          <Card 
            className="cursor-pointer hover-elevate active-elevate-2 transition-all neon-border-subtle"
            onClick={handleQuickBuild}
            data-testid="card-deal-studio-quick"
          >
            <CardContent className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Deal Studio – Quick Build</h3>
                  <p className="text-sm text-muted-foreground">
                    30-second payment quotes with instant calculations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Deal Studio - Full Build */}
          <Card 
            className="cursor-pointer hover-elevate active-elevate-2 transition-all neon-border-subtle"
            onClick={handleFullBuild}
            data-testid="card-deal-studio-full"
          >
            <CardContent className="p-4 bg-gradient-to-br from-accent/5 to-accent/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Deal Studio – Full Build</h3>
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
