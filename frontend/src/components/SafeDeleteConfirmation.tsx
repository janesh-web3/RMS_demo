import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertTriangle } from "lucide-react";

interface SafeDeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  loading?: boolean;
}

export const SafeDeleteConfirmation: React.FC<SafeDeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  loading = false,
}) => {
  const [confirmationText, setConfirmationText] = useState("");
  const isConfirmEnabled = confirmationText === itemName && !loading;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmationText("");
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isConfirmEnabled) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Delete {itemType}?</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-foreground">
              Are you sure you want to delete {itemType.toLowerCase()} <span className="font-semibold">"{itemName}"</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. This will permanently delete the {itemType.toLowerCase()} and all associated data.
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-bold text-destructive">"{itemName}"</span> to confirm:
            </label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type "${itemName}" here`}
              className="border-destructive/30 focus:border-destructive"
              autoFocus
            />
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className="flex-1"
            >
              {loading ? "Deleting..." : `Delete ${itemType}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SafeDeleteConfirmation;