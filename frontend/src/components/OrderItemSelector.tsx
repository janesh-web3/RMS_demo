import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MenuItem } from '../types';
import { Plus, Minus } from 'lucide-react';

interface OrderItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (orderData: {
    itemId: string;
    quantity: number;
    selectedVariation?: string;
    addOns: string[];
    notes?: string;
    itemPrice: number;
    addOnPrice: number;
    totalPrice: number;
  }) => void;
  menuItem: MenuItem | null;
}

export const OrderItemSelector: React.FC<OrderItemSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  menuItem,
}) => {
  if (!menuItem) return null;
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Calculate prices
  const getVariationPrice = () => {
    if (!selectedVariation || !menuItem.variations) return menuItem.price;
    const variation = menuItem.variations.find(v => v.name === selectedVariation);
    return variation ? variation.price : menuItem.price;
  };

  const getAddOnPrice = () => {
    if (!selectedAddOns.length || !menuItem.addOns) return 0;
    return selectedAddOns.reduce((total, addOnName) => {
      const addOn = menuItem.addOns?.find(a => a.name === addOnName);
      return total + (addOn?.price || 0);
    }, 0);
  };

  const itemPrice = getVariationPrice();
  const addOnPrice = getAddOnPrice();
  const totalPrice = (itemPrice + addOnPrice) * quantity;

  const handleAddOnToggle = (addOnName: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addOnName) 
        ? prev.filter(name => name !== addOnName)
        : [...prev, addOnName]
    );
  };

  const handleAddToOrder = () => {
    onSelect({
      itemId: menuItem._id,
      quantity,
      selectedVariation: selectedVariation || undefined,
      addOns: selectedAddOns,
      notes: notes || undefined,
      itemPrice,
      addOnPrice,
      totalPrice,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{menuItem.name}</DialogTitle>
          {menuItem.description && (
            <p className="text-sm text-muted-foreground">{menuItem.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Quantity Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-10 w-10 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Variations */}
          {menuItem.variations && menuItem.variations.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Size/Variation</label>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="radio"
                      name="variation"
                      value=""
                      checked={selectedVariation === ''}
                      onChange={() => setSelectedVariation('')}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Regular</div>
                      <div className="text-sm text-muted-foreground">रू {menuItem.price.toFixed(2)}</div>
                    </div>
                  </label>
                  {menuItem.variations.map((variation) => (
                    <label
                      key={variation.name}
                      className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name="variation"
                        value={variation.name}
                        checked={selectedVariation === variation.name}
                        onChange={() => setSelectedVariation(variation.name)}
                        className="text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{variation.name}</div>
                        <div className="text-sm text-muted-foreground">रू {variation.price.toFixed(2)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add-ons */}
          {menuItem.addOns && menuItem.addOns.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Add-ons</label>
              <div className="space-y-2">
                {menuItem.addOns.map((addOn) => (
                  <label
                    key={addOn.name}
                    className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(addOn.name)}
                      onChange={() => handleAddOnToggle(addOn.name)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{addOn.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {addOn.price > 0 ? `+रू ${addOn.price.toFixed(2)}` : 'Free'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Special Notes (Optional)</label>
            <Input
              placeholder="e.g., No onion, Extra spicy, Less salt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Price Summary */}
          <div className="bg-accent/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Item Price:</span>
              <span>रू {itemPrice.toFixed(2)}</span>
            </div>
            {addOnPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span>Add-ons:</span>
                <span>रू {addOnPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span>{quantity}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-primary">रू {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToOrder}
              className="flex-1 btn-hover"
            >
              Add to Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};