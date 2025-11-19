import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Car, Repeat, Users, FileText, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Customer } from '@shared/schema';

interface CustomerActionMenuProps {
  customer: Customer;
  variant?: 'default' | 'compact';
}

export function CustomerActionMenu({ customer, variant = 'default' }: CustomerActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user for salesperson ID
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Start deal mutation
  const startDealMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/deals', {
        customerId: customer.id,
        salespersonId: (currentUser as any)?.id, // Use current user as salesperson
      });

      if (!response.ok) {
        throw new Error('Failed to create deal');
      }

      return response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer.id}/history`] });
      toast({
        title: 'Deal created',
        description: `Deal started for ${customer.firstName} ${customer.lastName}`,
      });
      setLocation(`/deals/${deal.id}`);
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create deal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const actions = [
    {
      icon: Car,
      label: 'Add Vehicle',
      description: 'Select vehicle for deal',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      onClick: () => {
        // Navigate to vehicles page to select/add vehicle
        setLocation('/vehicles?select=true');
        setIsOpen(false);
        toast({
          title: 'Select a Vehicle',
          description: 'Choose a vehicle from inventory for this customer',
        });
      },
    },
    {
      icon: Repeat,
      label: 'Add Trade',
      description: 'Add trade-in vehicle',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      onClick: async () => {
        // Start a deal and navigate to trade section
        try {
          const response = await apiRequest('POST', '/api/deals', {
            customerId: customer.id,
            salespersonId: (currentUser as any)?.id,
          });
          const deal = await response.json();
          queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
          // Navigate to deal with trade focus
          setLocation(`/deals/${deal.id}?focus=trade`);
          setIsOpen(false);
          toast({
            title: 'Deal Created',
            description: 'Add the trade-in vehicle details',
          });
        } catch (error) {
          toast({
            title: 'Failed to create deal',
            description: 'Please try again',
            variant: 'destructive',
          });
        }
      },
    },
    {
      icon: Users,
      label: 'Add Co-Buyer',
      description: 'Add co-buyer to deal',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      onClick: () => {
        // Navigate to customers page to select co-buyer
        setLocation(`/customers?selectCobuyer=${customer.id}`);
        setIsOpen(false);
        toast({
          title: 'Select Co-Buyer',
          description: 'Choose or create a co-buyer for this customer',
        });
      },
    },
    {
      icon: FileText,
      label: 'Start Deal',
      description: 'Create new deal',
      color: 'text-primary',
      bgColor: 'bg-primary/10 hover:bg-primary/20',
      onClick: () => startDealMutation.mutate(),
    },
    {
      icon: CreditCard,
      label: 'Credit Center',
      description: 'View credit info',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      onClick: () => {
        setLocation(`/customers/${customer.id}/credit`);
        setIsOpen(false);
      },
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="relative">
        <Button
          size="icon"
          variant={isOpen ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'rounded-full transition-all duration-200',
            isOpen && 'rotate-45'
          )}
        >
          {isOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Floating action menu */}
            <div className="absolute bottom-full right-0 mb-2 z-50 w-56 bg-background border rounded-lg shadow-xl p-2 space-y-1">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    disabled={action.label === 'Start Deal' && startDealMutation.isPending}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                      action.bgColor,
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', action.color)} />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default variant - grid layout
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.label === 'Start Deal' && startDealMutation.isPending}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                action.bgColor,
                'hover:shadow-md hover:scale-105',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
              )}
            >
              <Icon className={cn('w-5 h-5', action.color)} />
              <div className="text-center">
                <div className="text-xs font-medium">{action.label}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
