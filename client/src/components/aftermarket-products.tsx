import { useState } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AftermarketProduct } from '@shared/schema';
import { nanoid } from 'nanoid';

interface AftermarketProductsProps {
  products: AftermarketProduct[];
  onChange: (products: AftermarketProduct[]) => void;
}

const PRODUCT_CATEGORIES = [
  { value: 'warranty', label: 'Extended Warranty', defaultTerm: 60 },
  { value: 'gap', label: 'GAP Insurance', defaultTerm: 72 },
  { value: 'maintenance', label: 'Maintenance Plan', defaultTerm: 36 },
  { value: 'tire_wheel', label: 'Tire & Wheel Protection', defaultTerm: 60 },
  { value: 'theft', label: 'Theft Protection', defaultTerm: 60 },
  { value: 'paint_protection', label: 'Paint Protection', defaultTerm: 0 },
  { value: 'window_tint', label: 'Window Tint', defaultTerm: 0 },
  { value: 'bedliner', label: 'Bedliner', defaultTerm: 0 },
  { value: 'etch', label: 'VIN Etching', defaultTerm: 0 },
  { value: 'custom', label: 'Custom Item', defaultTerm: 0 },
] as const;

export function AftermarketProducts({ products, onChange }: AftermarketProductsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<AftermarketProduct>>({
    category: 'warranty',
    cost: 0,
    price: 0,
    taxable: false,
  });

  const handleAddProduct = () => {
    const category = PRODUCT_CATEGORIES.find(c => c.value === newProduct.category);
    const product: AftermarketProduct = {
      id: nanoid(),
      name: newProduct.name || category?.label || 'Custom Item',
      category: newProduct.category as AftermarketProduct['category'],
      cost: Number(newProduct.cost) || 0,
      price: Number(newProduct.price) || 0,
      term: newProduct.term || category?.defaultTerm,
      taxable: newProduct.taxable || false,
    };

    onChange([...products, product]);
    setShowAddForm(false);
    setNewProduct({
      category: 'warranty',
      cost: 0,
      price: 0,
      taxable: false,
    });
  };

  const handleRemoveProduct = (id: string) => {
    onChange(products.filter(p => p.id !== id));
  };

  const handleUpdateProduct = (id: string, updates: Partial<AftermarketProduct>) => {
    onChange(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const calculateMargin = (cost: number, price: number) => {
    if (price === 0) return 0;
    return ((price - cost) / price * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Existing Products */}
      {products.length > 0 && (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="border rounded-md p-4 space-y-3 hover-elevate"
              data-testid={`aftermarket-product-${product.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{product.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}
                    </Badge>
                    {product.term && product.term > 0 && (
                      <Badge variant="outline" className="text-xs">{product.term} months</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Cost</Label>
                      <p className="font-mono font-semibold">${product.cost.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <p className="font-mono font-semibold">${product.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Margin</Label>
                      <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                        {calculateMargin(product.cost, product.price)}%
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Impact</Label>
                      <p className="font-mono font-semibold">
                        +${(product.price / (product.term || 60)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={product.taxable}
                        onCheckedChange={(checked) => handleUpdateProduct(product.id, { taxable: checked })}
                        data-testid={`switch-taxable-${product.id}`}
                      />
                      <span>Subject to Sales Tax</span>
                    </label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveProduct(product.id)}
                  data-testid={`button-remove-${product.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Form */}
      {showAddForm ? (
        <div className="border rounded-md p-4 space-y-4 bg-muted/20" data-testid="add-product-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-category">Product Category</Label>
              <Select
                value={newProduct.category}
                onValueChange={(value) => {
                  const category = PRODUCT_CATEGORIES.find(c => c.value === value);
                  setNewProduct({ 
                    ...newProduct, 
                    category: value as AftermarketProduct['category'],
                    term: category?.defaultTerm,
                    name: category?.label
                  });
                }}
              >
                <SelectTrigger id="product-category" data-testid="select-product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-name">Custom Name (Optional)</Label>
              <Input
                id="product-name"
                placeholder={PRODUCT_CATEGORIES.find(c => c.value === newProduct.category)?.label}
                value={newProduct.name || ''}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-cost">Dealer Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="product-cost"
                  type="number"
                  className="pl-8"
                  placeholder="0.00"
                  value={newProduct.cost || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })}
                  data-testid="input-product-cost"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Customer Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="product-price"
                  type="number"
                  className="pl-8"
                  placeholder="0.00"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  data-testid="input-product-price"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-term">Term (Months)</Label>
              <Input
                id="product-term"
                type="number"
                placeholder="60"
                value={newProduct.term || ''}
                onChange={(e) => setNewProduct({ ...newProduct, term: parseInt(e.target.value) || 0 })}
                data-testid="input-product-term"
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={newProduct.taxable || false}
                  onCheckedChange={(checked) => setNewProduct({ ...newProduct, taxable: checked })}
                  data-testid="switch-new-taxable"
                />
                <span>Subject to Sales Tax (varies by state)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddProduct} data-testid="button-confirm-add">
              Add Product
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full gap-2"
          data-testid="button-add-product"
        >
          <Plus className="w-4 h-4" />
          Add F&I or Accessory Product
        </Button>
      )}

      {products.length > 0 && (
        <div className="flex justify-between text-sm font-medium p-4 bg-muted/20 rounded-md">
          <span>Total Aftermarket Products:</span>
          <span className="font-mono">
            ${products.reduce((sum, p) => sum + p.price, 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
