import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, Trash2, Upload, Search } from "lucide-react";
import { MenuItem as MenuItemType } from "../../types";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import IconSelector from "../IconSelector";

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: MenuItemType | null;
}

interface MenuItemForm {
  name: string;
  price: string;
  category: "Starters" | "Mains" | "Desserts" | "Drinks";
  description: string;
  variations: { name: string; price: string }[];
  addOns: { name: string; price: string }[];
  image?: string;
  icon?: string;
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem,
}) => {
  const [formData, setFormData] = useState<MenuItemForm>({
    name: "",
    price: "",
    category: "Starters",
    description: "",
    variations: [{ name: "", price: "" }],
    addOns: [{ name: "", price: "" }],
  });
  const [loading, setLoading] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const categories = ["Starters", "Mains", "Desserts", "Drinks"];

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          name: editingItem.name,
          price: editingItem.price.toString(),
          category: editingItem.category,
          description: editingItem.description || "",
          variations:
            editingItem.variations?.length > 0
              ? editingItem.variations.map((v) => ({
                  name: v.name,
                  price: v.price.toString(),
                }))
              : [{ name: "", price: "" }],
          addOns:
            editingItem.addOns?.length > 0
              ? editingItem.addOns.map((a) => ({
                  name: a.name,
                  price: a.price.toString(),
                }))
              : [{ name: "", price: "" }],
          image: (editingItem as any).image || "",
          icon: (editingItem as any).icon || "",
        });
        setImagePreview((editingItem as any).image || "");
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingItem]);

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: "Starters",
      description: "",
      variations: [{ name: "", price: "" }],
      addOns: [{ name: "", price: "" }],
    });
    setImageFile(null);
    setImagePreview("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear icon if image is selected
      setFormData({ ...formData, icon: "" });
    }
  };

  const handleIconSelect = (iconName: string) => {
    setFormData({ ...formData, icon: iconName });
    setShowIconSelector(false);
    // Clear image if icon is selected
    setImageFile(null);
    setImagePreview("");
  };

  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [...formData.variations, { name: "", price: "" }],
    });
  };

  const removeVariation = (index: number) => {
    if (formData.variations.length > 1) {
      const variations = formData.variations.filter((_, i) => i !== index);
      setFormData({ ...formData, variations });
    }
  };

  const updateVariation = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    const variations = [...formData.variations];
    variations[index] = { ...variations[index], [field]: value };
    setFormData({ ...formData, variations });
  };

  const addAddOn = () => {
    setFormData({
      ...formData,
      addOns: [...formData.addOns, { name: "", price: "" }],
    });
  };

  const removeAddOn = (index: number) => {
    if (formData.addOns.length > 1) {
      const addOns = formData.addOns.filter((_, i) => i !== index);
      setFormData({ ...formData, addOns });
    }
  };

  const updateAddOn = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    const addOns = [...formData.addOns];
    addOns[index] = { ...addOns[index], [field]: value };
    setFormData({ ...formData, addOns });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;

    try {
      setLoading(true);

      // Filter out empty variations and add-ons
      const variations = formData.variations
        .filter((v) => v.name.trim() && v.price)
        .map((v) => ({ name: v.name.trim(), price: parseFloat(v.price) }));

      const addOns = formData.addOns
        .filter((a) => a.name.trim())
        .map((a) => ({ name: a.name.trim(), price: parseFloat(a.price) || 0 }));

      const menuData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        variations,
        addOns,
        ...(formData.icon && { icon: formData.icon }),
      };

      if (editingItem) {
        await apiService.updateMenuItem(editingItem._id, menuData);
        toast.success("Menu item updated successfully!");
      } else {
        await apiService.createMenuItem(menuData);
        toast.success("Menu item added successfully!");
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save menu item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Item Name *
                </label>
                <Input
                  type="text"
                  placeholder="Enter item name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Base Price (रू) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <select
                  className="w-full p-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as any,
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Input
                  type="text"
                  placeholder="Brief description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Image/Icon Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Image or Icon (Optional)
              </label>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Image Upload */}
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-2">
                    Upload Image
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      title="Cloudinary integration coming soon"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Icon Selector */}
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-2">
                    Or Choose Icon
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowIconSelector(true)}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {formData.icon
                      ? `Selected: ${formData.icon}`
                      : "Select Icon"}
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {(imagePreview || formData.icon) && (
                <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/50">
                  <span className="text-sm font-medium">Preview:</span>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  {formData.icon && !imagePreview && (
                    <div className="w-12 h-12 flex items-center justify-center border rounded bg-background">
                      <span className="text-lg">{formData.icon}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variations Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Variations{" "}
                  <span className="text-xs text-muted-foreground">
                    (Size options like Small, Medium, Large)
                  </span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addVariation}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </Button>
              </div>
              <div className="space-y-2">
                {formData.variations.map((variation, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Variation name (e.g., Large)"
                      value={variation.name}
                      onChange={(e) =>
                        updateVariation(index, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={variation.price}
                      onChange={(e) =>
                        updateVariation(index, "price", e.target.value)
                      }
                      className="w-24"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeVariation(index)}
                      disabled={formData.variations.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Add-ons{" "}
                  <span className="text-xs text-muted-foreground">
                    (Optional extras like cheese, sauces)
                  </span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addAddOn}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </Button>
              </div>
              <div className="space-y-2">
                {formData.addOns.map((addOn, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Add-on name (e.g., Extra Cheese)"
                      value={addOn.name}
                      onChange={(e) =>
                        updateAddOn(index, "name", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Extra cost (0 for free)"
                      value={addOn.price}
                      onChange={(e) =>
                        updateAddOn(index, "price", e.target.value)
                      }
                      className="w-32"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeAddOn(index)}
                      disabled={formData.addOns.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading
                  ? "Saving..."
                  : editingItem
                  ? "Update Item"
                  : "Add Item"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {showIconSelector && (
        <IconSelector
          isOpen={showIconSelector}
          onClose={() => setShowIconSelector(false)}
          onSelect={handleIconSelect}
        />
      )}
    </>
  );
};

export default MenuItemModal;
