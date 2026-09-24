import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import type { InventoryItem, StockMovementType } from '@/types';

interface StockAdjustmentModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!item) return null;

  const [type, setType] = useState<StockMovementType>('RESTOCK');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive integer.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiClient.post('/inventory/adjust', {
        inventoryItemId: item.id,
        type,
        quantity: qty,
        reason: reason || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      description={`Update stock levels for ${item.product?.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-graphite-200 bg-graphite-50/75 p-3 flex justify-between items-center text-xs">
          <div>
            <p className="text-graphite-500">Current Stock</p>
            <p className="text-base font-bold text-graphite-900">{item.quantity} units</p>
          </div>
          <div>
            <p className="text-graphite-500">Reorder Level</p>
            <p className="text-base font-bold text-graphite-900">{item.reorderLevel} units</p>
          </div>
        </div>

        <Select
          label="Adjustment Type"
          value={type}
          onChange={(e) => setType(e.target.value as StockMovementType)}
          options={[
            { value: 'RESTOCK', label: 'Restock (Add Stock)' },
            { value: 'ADJUSTMENT', label: 'Manual Adjustment' },
            { value: 'SALE', label: 'Manual Sale (Deduct Stock)' },
            { value: 'RETURN', label: 'Customer Return' },
          ]}
        />

        <Input
          label="Quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Reason / Note</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. New workshop batch received, audit discrepancy"
            className="h-9 w-full rounded-lg border border-graphite-300 px-3 text-xs text-graphite-900"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-graphite-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
