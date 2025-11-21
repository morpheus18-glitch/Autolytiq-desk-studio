import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Check, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/core/utils';
import type { FeePackageTemplate } from '@shared/schema';

interface FeePackageSelectorProps {
  dealId: string;
  scenarioId: string;
}

export function FeePackageSelector({ dealId, scenarioId }: FeePackageSelectorProps) {
  const { toast } = useToast();
  const [appliedId, setAppliedId] = useState<string | null>(null);
  
  const { data: templates = [], isLoading } = useQuery<FeePackageTemplate[]>({
    queryKey: ['/api/templates'],
    queryFn: async () => {
      const response = await fetch('/api/templates?active=true');
      if (!response.ok) throw new Error('Failed to load templates');
      return response.json();
    },
  });
  
  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('POST', `/api/deals/${dealId}/scenarios/${scenarioId}/apply-template`, {
        templateId,
      });
    },
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      setAppliedId(templateId);
      setTimeout(() => setAppliedId(null), 2000);
      
      const template = templates.find(t => t.id === templateId);
      toast({
        title: 'Package Applied',
        description: `${template?.name} has been added to the scenario.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Apply Package',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  const calculateTotal = (template: FeePackageTemplate): number => {
    const fees = Array.isArray(template.dealerFees) 
      ? template.dealerFees.reduce((sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0)
      : 0;
    const accessories = Array.isArray(template.accessories)
      ? template.accessories.reduce((sum: number, acc: any) => sum + (Number(acc.amount) || 0), 0)
      : 0;
    const products = Array.isArray(template.aftermarketProducts)
      ? template.aftermarketProducts.reduce((sum: number, prod: any) => sum + (Number(prod.price) || 0), 0)
      : 0;
    return fees + accessories + products;
  };
  
  const getCounts = (template: FeePackageTemplate) => ({
    fees: Array.isArray(template.dealerFees) ? template.dealerFees.length : 0,
    accessories: Array.isArray(template.accessories) ? template.accessories.length : 0,
    products: Array.isArray(template.aftermarketProducts) ? template.aftermarketProducts.length : 0,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (templates.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Fee Package Templates</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {templates.map((template) => {
          const counts = getCounts(template);
          const total = calculateTotal(template);
          const isApplying = applyMutation.isPending && applyMutation.variables === template.id;
          const wasApplied = appliedId === template.id;
          
          return (
            <Card 
              key={template.id} 
              className="p-4 space-y-3 hover-elevate"
              data-testid={`card-template-${template.category}`}
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{template.name}</h4>
                  <Badge 
                    variant="outline" 
                    className="text-xs capitalize"
                    data-testid={`badge-category-${template.category}`}
                  >
                    {template.category}
                  </Badge>
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dealer Fees</span>
                  <span className="font-medium tabular-nums" data-testid={`text-fees-count-${template.category}`}>
                    {counts.fees} items
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Accessories</span>
                  <span className="font-medium tabular-nums" data-testid={`text-accessories-count-${template.category}`}>
                    {counts.accessories} items
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">F&I Products</span>
                  <span className="font-medium tabular-nums" data-testid={`text-products-count-${template.category}`}>
                    {counts.products} items
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Value</span>
                  <span className="font-semibold font-mono tabular-nums" data-testid={`text-total-${template.category}`}>
                    {formatCurrency(total)}
                  </span>
                </div>
                
                <Button
                  onClick={() => applyMutation.mutate(template.id)}
                  disabled={isApplying || wasApplied}
                  className="w-full"
                  size="sm"
                  data-testid={`button-apply-${template.category}`}
                >
                  {wasApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Applied
                    </>
                  ) : isApplying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                      Apply Package
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
