"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

interface Attribute {
  id: string;
  value: string;
  colorHex?: string | null;
  group: { id: string; name: string };
}

interface VariantAttribute {
  attributeId: string;
  attribute: Attribute;
}

interface ProductVariant {
  id: string;
  sku?: string | null;
  price?: number | string | null;
  stock: number;
  imageUrl?: string | null;
  isActive: boolean;
  variantAttributes: VariantAttribute[];
}

interface VariantPickerProps {
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
}

export function VariantPicker({ variants, onSelect }: VariantPickerProps) {
  const activeVariants = useMemo(() => variants.filter((v) => v.isActive), [variants]);

  const groups = useMemo(() => {
    const groupMap = new Map<string, { id: string; name: string; attributes: Attribute[] }>();
    for (const variant of activeVariants) {
      for (const va of variant.variantAttributes) {
        const g = va.attribute.group;
        if (!groupMap.has(g.id)) {
          groupMap.set(g.id, { id: g.id, name: g.name, attributes: [] });
        }
        const existing = groupMap.get(g.id)!;
        if (!existing.attributes.find((a) => a.id === va.attribute.id)) {
          existing.attributes.push(va.attribute);
        }
      }
    }
    return Array.from(groupMap.values());
  }, [activeVariants]);

  const [selected, setSelected] = useState<Record<string, string>>({});

  const matchedVariant = useMemo(() => {
    if (Object.keys(selected).length !== groups.length || groups.length === 0) return null;
    return (
      activeVariants.find((v) => {
        const attrIds = new Set(v.variantAttributes.map((va) => va.attributeId));
        return Object.values(selected).every((id) => attrIds.has(id));
      }) ?? null
    );
  }, [selected, activeVariants, groups.length]);

  const isAttributeAvailable = (groupId: string, attrId: string): boolean => {
    const trial = { ...selected, [groupId]: attrId };
    const selectedCount = Object.keys(trial).length;
    return activeVariants.some((v) => {
      const attrIds = new Set(v.variantAttributes.map((va) => va.attributeId));
      const matchCount = Object.values(trial).filter((id) => attrIds.has(id)).length;
      return matchCount === selectedCount && v.stock > 0;
    });
  };

  const handleSelect = (groupId: string, attrId: string) => {
    setSelected((prev) => {
      if (prev[groupId] === attrId) {
        const next = { ...prev };
        delete next[groupId];
        return next;
      }
      return { ...prev, [groupId]: attrId };
    });
  };

  const canAddToCart = matchedVariant != null && matchedVariant.stock > 0;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-sm font-medium">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.attributes.map((attr) => {
              const isSelected = selected[group.id] === attr.id;
              const available = isAttributeAvailable(group.id, attr.id);
              return (
                <button
                  key={attr.id}
                  onClick={() => available && handleSelect(group.id, attr.id)}
                  disabled={!available}
                  className={[
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : available
                      ? "border-gray-200 hover:border-gray-400 dark:border-gray-700"
                      : "cursor-not-allowed border-gray-100 text-gray-300 line-through dark:border-gray-800 dark:text-gray-600",
                  ].join(" ")}
                  style={attr.colorHex && available ? { borderColor: attr.colorHex } : undefined}
                >
                  {attr.colorHex && (
                    <span
                      className="me-1.5 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: attr.colorHex }}
                    />
                  )}
                  {attr.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {matchedVariant && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <div className="flex-1">
            <p className="text-lg font-semibold">
              {matchedVariant.price != null
                ? `${Number(matchedVariant.price).toLocaleString()} DA`
                : "—"}
            </p>
            {matchedVariant.stock > 0 ? (
              <p className="text-xs text-gray-500">{matchedVariant.stock} in stock</p>
            ) : (
              <p className="text-xs text-red-500">Out of stock</p>
            )}
          </div>
          {matchedVariant.sku && (
            <Badge variant="secondary" className="text-xs">SKU: {matchedVariant.sku}</Badge>
          )}
        </div>
      )}

      <Button
        className="w-full"
        disabled={!canAddToCart}
        onClick={() => matchedVariant && onSelect(matchedVariant)}
      >
        <ShoppingCart className="me-2 h-4 w-4" />
        {!matchedVariant
          ? "Select options"
          : matchedVariant.stock === 0
          ? "Out of Stock"
          : "Add to Cart"}
      </Button>
    </div>
  );
}
