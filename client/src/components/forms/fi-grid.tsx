import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurrencyField } from '@/components/ui/currency-field';
import { formatCurrency } from '@/core/utils';
import { Plus, Trash2, TrendingUp, Package } from 'lucide-react';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { EmptyState } from '@/components/ui/empty-state';

interface AftermarketProduct {
  name: string;
  cost: number;
  price: number;
}

const COMMON_PRODUCTS = [
  { name: 'Extended Warranty', cost: 800, price: 1500 },
  { name: 'Gap Insurance', cost: 300, price: 695 },
  { name: 'Tire & Wheel Protection', cost: 200, price: 495 },
  { name: 'Paint Protection', cost: 150, price: 495 },
  { name: 'Maintenance Plan', cost: 400, price: 995 },
];

export function FIGrid() {
  const { scenario, updateField } = useScenarioForm();
  
  // Normalize products: convert legacy string cost/price to numbers for backward compatibility
  const normalizeProduct = (p: any): AftermarketProduct => ({
    name: p.name,
    cost: typeof p.cost === 'string' ? parseFloat(p.cost || '0') : (p.cost ?? 0),
    price: typeof p.price === 'string' ? parseFloat(p.price || '0') : (p.price ?? 0),
  });
  
  // Derive products from context (no local state)
  const products: AftermarketProduct[] = ((scenario.aftermarketProducts as any[]) || []).map(normalizeProduct);
  
  // Helper to calculate margin (derived, not stored)
  const calculateMargin = (product: AftermarketProduct): number => {
    const cost = product.cost ?? 0;
    const price = product.price ?? 0;
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    return isNaN(margin) ? 0 : margin;
  };
  
  const addProduct = (template?: typeof COMMON_PRODUCTS[0]) => {
    const newProduct: AftermarketProduct = {
      name: template?.name || 'New Product',
      cost: template?.cost ?? 0,
      price: template?.price ?? 0,
    };
    
    const updated = [...products, newProduct];
    updateField('aftermarketProducts', updated);
  };
  
  const removeProduct = (index: number) => {
    const updated = products.filter((_, i) => i !== index);
    updateField('aftermarketProducts', updated);
  };
  
  const updateProduct = (index: number, field: keyof AftermarketProduct, value: string | number) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    updateField('aftermarketProducts', updated);
  };
  
  const totalCost = products.reduce((sum, p) => sum + (p.cost ?? 0), 0);
  const totalPrice = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const totalMargin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Add Buttons */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Add Common Products</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
          {COMMON_PRODUCTS.map((product, idx) => (
            <Button
              key={idx}
              variant="outline"
              onClick={() => addProduct(product)}
              className="text-xs justify-start sm:justify-center"
              data-testid={`button-add-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
              {product.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Empty State */}
      {products.length === 0 && (
        <EmptyState
          icon={Package}
          title="No F&I Products Added"
          description="Increase deal profitability by adding aftermarket products like extended warranties, GAP insurance, and protection plans. Use the quick-add buttons above to get started."
          containerTestId="empty-state-fi-products"
          className="py-8 md:py-12"
        />
      )}
      
      {/* Products Grid */}
      {products.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Added Products</Label>
          <div className="space-y-3">
            {products.map((product, index) => (
              <Card key={index} className="p-3 md:p-4" data-testid={`card-product-${index}`}>
                <div className="space-y-3 md:space-y-4">
                  {/* Product Name & Remove Button */}
                  <div className="flex items-start justify-between gap-2 md:gap-3">
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`product-name-${index}`} className="text-xs text-muted-foreground">
                        Product Name
                      </Label>
                      <Input
                        id={`product-name-${index}`}
                        value={product.name}
                        onChange={(e) => updateProduct(index, 'name', e.target.value)}
                        className="mt-1 min-h-11 text-base"
                        data-testid={`input-product-name-${index}`}
                      />
                    </div>
                    <div className="pt-5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProduct(index)}
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        data-testid={`button-remove-product-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Cost, Price, Margin Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Cost */}
                    <div>
                      <CurrencyField
                        label="Dealer Cost"
                        value={product.cost ?? null}
                        onChange={(value) => updateProduct(index, 'cost', value ?? 0)}
                        testId={`input-product-cost-${index}`}
                      />
                    </div>
                    
                    {/* Price */}
                    <div>
                      <CurrencyField
                        label="Selling Price"
                        value={product.price ?? null}
                        onChange={(value) => updateProduct(index, 'price', value ?? 0)}
                        testId={`input-product-price-${index}`}
                      />
                    </div>
                    
                    {/* Margin (derived) */}
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-muted-foreground">Margin</Label>
                      <div className="mt-1 flex items-center min-h-11">
                        <Badge
                          variant={calculateMargin(product) >= 40 ? 'default' : calculateMargin(product) >= 20 ? 'secondary' : 'outline'}
                          className="text-sm font-mono tabular-nums px-3 py-1.5"
                          data-testid={`text-product-margin-${index}`}
                        >
                          {calculateMargin(product).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Add Custom Product Button */}
      <Button
        variant="outline"
        size="lg"
        onClick={() => addProduct()}
        className="w-full"
        data-testid="button-add-custom-product"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Product
      </Button>
      
      {/* Totals Summary */}
      {products.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              F&I Products Summary
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                <div className="text-lg font-mono font-semibold tabular-nums" data-testid="text-total-cost">
                  {formatCurrency(totalCost)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total Price</div>
                <div className="text-lg font-mono font-semibold tabular-nums" data-testid="text-total-price">
                  {formatCurrency(totalPrice)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Avg Margin</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-primary" data-testid="text-total-margin">
                  {totalMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
