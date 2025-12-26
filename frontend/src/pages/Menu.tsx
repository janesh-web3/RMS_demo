import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { MenuItem as MenuItemType } from "../types";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Edit, Trash2, Palette } from "lucide-react";
import SafeDeleteConfirmation from "../components/SafeDeleteConfirmation";
import Pagination from "../components/Pagination";
import MenuItemModal from "../components/modals/MenuItemModal";
import * as LucideIcons from "lucide-react";

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [deletingItem, setDeletingItem] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItemType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const { user } = useAuth();

  const categories = ["Starters", "Mains", "Desserts", "Drinks"];

  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, currentPage, itemsPerPage]);

  const fetchMenuItems = async () => {
    try {
      const params = {
        ...(selectedCategory ? { category: selectedCategory } : {}),
        active: true,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };
      const response = await apiService.getMenuItems(params);
      
      // Handle different response formats
      if (Array.isArray(response)) {
        setMenuItems(response);
        setTotalItems(response.length);
      } else {
        setMenuItems((response as any).items || []);
        setTotalItems((response as any).totalCount || 0);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowMenuItemModal(true);
  };

  const handleEditItem = (item: MenuItemType) => {
    setEditingItem(item);
    setShowMenuItemModal(true);
  };

  const handleDeleteItem = (item: MenuItemType) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setDeletingItem(itemToDelete._id);
      await apiService.deleteMenuItem(itemToDelete._id);
      fetchMenuItems();
      toast.success("Menu item deleted successfully!");
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Failed to delete menu item. Please try again.");
    } finally {
      setDeletingItem("");
    }
  };

  const handleModalSuccess = () => {
    fetchMenuItems();
  };

  const handleModalClose = () => {
    setShowMenuItemModal(false);
    setEditingItem(null);
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-8 w-8 text-primary" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your restaurant's menu items with images and icons
          </p>
        </div>
        {user?.role === "Admin" && (
          <Button
            onClick={handleAddItem}
            className="flex items-center space-x-2 touch-target btn-hover"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        <Button
          variant={selectedCategory === "" ? "default" : "outline"}
          onClick={() => {
            setSelectedCategory("");
            setCurrentPage(1);
          }}
          size="sm"
          className="touch-target"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentPage(1);
            }}
            size="sm"
            className="touch-target"
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="space-y-8">
        {menuItems.length > 0 && (
          <div>
            {selectedCategory && (
              <h2 className="text-2xl font-semibold mb-4">
                {selectedCategory}
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <Card
                  key={item._id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        {/* Display icon or image */}
                        <div className="flex-shrink-0">
                          {(item as any).icon ? (
                            <div className="w-12 h-12 flex items-center justify-center border rounded-lg bg-muted/50">
                              {renderIcon((item as any).icon)}
                            </div>
                          ) : (item as any).image ? (
                            <img
                              src={(item as any).image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center border rounded-lg bg-muted/50">
                              <Palette className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            रू {item.price.toFixed(2)}
                            {item.variations?.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                base
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {user?.role === "Admin" && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditItem(item)}
                            className="touch-target"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteItem(item)}
                            disabled={deletingItem === item._id}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 touch-target"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                      
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}

                      {item.variations && item.variations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Variations:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.variations.map((variation, index) => (
                              <span
                                key={index}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {variation.name}: रू {variation.price.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.addOns && item.addOns.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Add-ons:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.addOns.map((addOn, index) => (
                              <span
                                key={index}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {addOn.name}
                                {addOn.price > 0 && ` (+रू ${addOn.price.toFixed(2)})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {menuItems.length === 0 && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg mb-2">No menu items found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedCategory
                ? `No items in ${selectedCategory} category`
                : "Start building your menu"}
            </p>
            {user?.role === "Admin" && (
              <Button onClick={handleAddItem}>
                Add Your First Menu Item
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalItems > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
          />
        )}
      </div>

      {/* Menu Item Modal - Lazy loaded */}
      {showMenuItemModal && (
        <MenuItemModal
          isOpen={showMenuItemModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editingItem={editingItem}
        />
      )}

      {/* Safe Delete Confirmation Dialog */}
      <SafeDeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteItem}
        itemName={itemToDelete?.name || ""}
        itemType="Menu Item"
        loading={deletingItem !== ""}
      />
    </div>
  );
};

export default Menu;