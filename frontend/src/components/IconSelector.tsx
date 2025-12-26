import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { 
  Search, Plus, Minus, Edit, Trash2, Settings, Eye, EyeOff, Star, Heart, 
  Clock, Calendar, User, Users, Home, Menu, ShoppingCart, Package, Truck, 
  MapPin, Phone, Mail, Coffee, Pizza, Apple, ChefHat, Utensils,
  Wine, Beer, Cake, Cookie, Fish, Beef, Salad, Soup,
  CheckCircle, AlertCircle, Info, X, ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
  Save, Download, Upload, Printer, Copy, Share, Lock, Unlock, Wifi, Battery,
  Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Repeat,
  Shuffle, Camera, Image, Video, Mic, MicOff, Speaker, Headphones,
  Smartphone, Laptop, Monitor, Tablet, Watch, Gamepad2, Keyboard,
  Mouse, Router, Server, Database, Cloud,
  HardDrive, Cpu, Usb, Bluetooth, Zap, Plug
} from "lucide-react";

interface IconSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Icon registry - manually imported icons
  const iconRegistry: { [key: string]: React.ComponentType<any> } = {
    // UI Icons
    Search, Plus, Minus, Edit, Trash2, Settings, Eye, EyeOff, Star, Heart,
    Clock, Calendar, User, Users, Home, Menu, ShoppingCart, Package, Truck,
    MapPin, Phone, Mail, CheckCircle, AlertCircle, Info, X, ArrowRight, 
    ArrowLeft, ArrowUp, ArrowDown, Save, Download, Upload, Printer, Copy, 
    Share, Lock, Unlock, Wifi, Battery, Volume2, VolumeX, Play, Pause, 
    SkipForward, SkipBack, Repeat, Shuffle, Camera, Image, Video, 
    Mic, MicOff, Speaker, Headphones, Smartphone, Laptop, Monitor, Tablet, 
    Watch, Gamepad2, Keyboard, Mouse, Router, 
    Server, Database, Cloud, HardDrive, Cpu, Usb, Bluetooth, 
    Zap, Plug,
    // Food & Restaurant Icons
    Coffee, Pizza, Apple, ChefHat, Utensils, Wine, 
    Beer, Cake, Cookie, Fish, Beef, Salad, Soup
  };

  // Get all available icons
  const allIcons = Object.keys(iconRegistry);

  // Common food and restaurant related icons (only those we've imported)
  const commonFoodIcons = [
    // Food items
    "Coffee", "Pizza", "Apple", "Beef", "Fish", "Salad", "Soup", "Wine", 
    "Beer", "Cake", "Cookie",
    // Restaurant tools
    "ChefHat", "Utensils",
    // Common UI icons
    "Eye", "EyeOff", "Search", "Plus", "Minus", "Edit", "Trash2", "Settings",
    "Star", "Heart", "Clock", "Calendar", "User", "Users", "Home", "Menu",
    "ShoppingCart", "Package", "Truck", "MapPin", "Phone", "Mail"
  ];

  // Filter icons based on search term
  const filteredIcons = searchTerm
    ? allIcons.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : commonFoodIcons.filter(icon => allIcons.includes(icon));

  const handleIconSelect = (iconName: string) => {
    onSelect(iconName);
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconRegistry[iconName];
    if (!IconComponent) {
      // If icon doesn't exist, show a placeholder for debugging
      return (
        <Button
          key={iconName}
          variant="outline"
          className="h-16 w-16 p-2 flex flex-col items-center justify-center hover:bg-primary/10 opacity-50"
          title={`${iconName} (not found)`}
          disabled
        >
          <div className="h-6 w-6 mb-1 bg-muted rounded flex items-center justify-center text-xs">?</div>
          <span className="text-xs truncate w-full text-center text-red-500">
            {iconName}
          </span>
        </Button>
      );
    }
    
    return (
      <Button
        key={iconName}
        variant="outline"
        className="h-16 w-16 p-2 flex flex-col items-center justify-center hover:bg-primary/10"
        onClick={() => handleIconSelect(iconName)}
        title={iconName}
      >
        <IconComponent className="h-6 w-6 mb-1" />
        <span className="text-xs truncate w-full text-center">
          {iconName}
        </span>
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons... (try: eye, search, plus, edit)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Debug info for development */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Available: {allIcons.length} total icons. 
            {searchTerm ? (
              <>
                Found {filteredIcons.length} matches for "{searchTerm}".
                {filteredIcons.length > 0 && (
                  <span> First few: {filteredIcons.slice(0, 5).join(", ")}</span>
                )}
              </>
            ) : (
              <>Showing {commonFoodIcons.length} common icons.</>
            )}
          </div>

          {/* Icons Grid */}
          <div className="overflow-y-auto max-h-96">
            {!searchTerm && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                  Common Food & Restaurant Icons
                </h3>
                <div className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium">Popular searches:</span>
                  <button 
                    className="ml-2 text-primary hover:underline" 
                    onClick={() => setSearchTerm("eye")}
                  >
                    eye
                  </button>
                  <button 
                    className="ml-2 text-primary hover:underline" 
                    onClick={() => setSearchTerm("star")}
                  >
                    star
                  </button>
                  <button 
                    className="ml-2 text-primary hover:underline" 
                    onClick={() => setSearchTerm("heart")}
                  >
                    heart
                  </button>
                  <button 
                    className="ml-2 text-primary hover:underline" 
                    onClick={() => setSearchTerm("user")}
                  >
                    user
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {filteredIcons.slice(0, 200).map(renderIcon)}
            </div>

            {filteredIcons.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No icons found matching "{searchTerm}"</p>
                <p className="text-xs mt-2">
                  Try searching for: eye, search, plus, edit, settings, etc.
                </p>
              </div>
            )}

            {searchTerm && filteredIcons.length > 0 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                Found {filteredIcons.length} icons matching "{searchTerm}"
                {filteredIcons.length > 200 && " (showing first 200)"}
              </div>
            )}

            {filteredIcons.length > 200 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Showing first 200 results. Try a more specific search.
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconSelector;