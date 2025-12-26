import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table as TableType } from "../../types";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTable?: TableType | null;
}

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingTable,
}) => {
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTable) {
      setTableNumber(editingTable.tableNumber);
    } else {
      setTableNumber("");
    }
  }, [editingTable, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    try {
      setLoading(true);

      if (editingTable) {
        await apiService.updateTable(editingTable._id, {
          tableNumber: tableNumber.trim(),
        });
        toast.success("Table updated successfully!");
      } else {
        await apiService.createTable({ tableNumber: tableNumber.trim() });
        toast.success("Table added successfully!");
      }

      onSuccess();
      onClose();
      setTableNumber("");
    } catch (error) {
      console.error("Error saving table:", error);
      toast.error("Failed to save table. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTableNumber("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingTable ? "Edit Table" : "Add New Table"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Table Number *
            </label>
            <Input
              type="text"
              placeholder="Enter table number (e.g., 1, A1, VIP-1)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use numbers, letters, or combinations like "1", "A1", "VIP-1"
            </p>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="submit"
              disabled={loading || !tableNumber.trim()}
              className="flex-1"
            >
              {loading
                ? "Saving..."
                : editingTable
                ? "Update Table"
                : "Add Table"}
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
  );
};

export default TableModal;