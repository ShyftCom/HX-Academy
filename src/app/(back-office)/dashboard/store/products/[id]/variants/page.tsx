"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Zap, Save, X } from "lucide-react";

type Attribute = { id: string; groupId: string; value: string; colorHex?: string | null };
type AttributeGroup = { id: string; name: string; attributes: Attribute[] };

type VariantRow = {
  attributeIds: string[];
  attributeLabels: string[];
  sku: string;
  price: string;
  stock: string;
  isActive: boolean;
};

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesian(rest);
  return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
}

export default function VariantsPage() {
  const { id: productId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [generated, setGenerated] = useState(false);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<AttributeGroup[]>({
    queryKey: ["attribute-groups", productId],
    queryFn: () => fetch("/api/attribute-groups").then((r) => r.json()),
  });

  const { data: existingVariants = [] } = useQuery({
    queryKey: ["variants", productId],
    queryFn: () => fetch(`/api/products/${productId}/variants`).then((r) => r.json()),
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/attribute-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Group created");
      qc.invalidateQueries({ queryKey: ["attribute-groups", productId] });
      setNewGroupName("");
      setAddingGroup(false);
    },
    onError: () => toast.error("Failed to create group"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) =>
      fetch(`/api/attribute-groups/${groupId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Group deleted");
      qc.invalidateQueries({ queryKey: ["attribute-groups", productId] });
      setGenerated(false);
    },
    onError: () => toast.error("Failed to delete group"),
  });

  const addAttributeMutation = useMutation({
    mutationFn: ({ groupId, value }: { groupId: string; value: string }) =>
      fetch(`/api/attribute-groups/${groupId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }).then((r) => r.json()),
    onSuccess: (_, { groupId }) => {
      toast.success("Value added");
      qc.invalidateQueries({ queryKey: ["attribute-groups", productId] });
      setNewValues((prev) => ({ ...prev, [groupId]: "" }));
      setGenerated(false);
    },
    onError: () => toast.error("Failed to add value"),
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: (attrId: string) =>
      fetch(`/api/attributes/${attrId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Value deleted");
      qc.invalidateQueries({ queryKey: ["attribute-groups", productId] });
      setGenerated(false);
    },
    onError: () => toast.error("Failed to delete value"),
  });

  const saveVariantsMutation = useMutation({
    mutationFn: (variants: VariantRow[]) =>
      fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variants: variants.map((v) => ({
            sku: v.sku || undefined,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            isActive: v.isActive,
            attributeIds: v.attributeIds,
          })),
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Variants saved");
      qc.invalidateQueries({ queryKey: ["variants", productId] });
    },
    onError: () => toast.error("Failed to save variants"),
  });

  const generateVariants = useCallback(() => {
    const groupsWithAttrs = groups.filter((g) => g.attributes.length > 0);
    if (groupsWithAttrs.length === 0) {
      toast.error("Add at least one attribute group with values");
      return;
    }

    const attrIdArrays = groupsWithAttrs.map((g) => g.attributes.map((a) => a.id));
    const attrLabelArrays = groupsWithAttrs.map((g) => g.attributes.map((a) => a.value));

    const idCombinations = cartesian(attrIdArrays);
    const labelCombinations = cartesian(attrLabelArrays);

    const rows: VariantRow[] = idCombinations.map((ids, i) => ({
      attributeIds: ids,
      attributeLabels: labelCombinations[i],
      sku: "",
      price: "",
      stock: "0",
      isActive: true,
    }));

    setVariantRows(rows);
    setGenerated(true);
  }, [groups]);

  const updateRow = (index: number, field: keyof VariantRow, value: string | boolean) => {
    setVariantRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const groupCols = groups.filter((g) => g.attributes.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Variants"
        description="Define attribute groups, then generate and configure product variants"
      />

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Attribute Groups</h2>
          {!addingGroup && (
            <Button size="sm" variant="outline" onClick={() => setAddingGroup(true)}>
              <Plus className="me-1.5 h-4 w-4" />
              Add Group
            </Button>
          )}
        </div>

        {addingGroup && (
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Size, Color"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGroupName.trim()) {
                  createGroupMutation.mutate(newGroupName.trim());
                }
              }}
              autoFocus
            />
            <Button
              onClick={() => newGroupName.trim() && createGroupMutation.mutate(newGroupName.trim())}
              loading={createGroupMutation.isPending}
            >
              Save
            </Button>
            <Button variant="outline" onClick={() => { setAddingGroup(false); setNewGroupName(""); }}>
              Cancel
            </Button>
          </div>
        )}

        {groupsLoading && <p className="text-sm text-gray-400">Loading...</p>}

        {groups.length === 0 && !groupsLoading && (
          <p className="text-sm text-gray-400">No attribute groups yet. Add one above.</p>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{group.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteGroupMutation.mutate(group.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {group.attributes.map((attr) => (
                  <span
                    key={attr.id}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                    style={attr.colorHex ? { backgroundColor: attr.colorHex + "22", borderColor: attr.colorHex, color: attr.colorHex } : {}}
                  >
                    {attr.value}
                    <button
                      onClick={() => deleteAttributeMutation.mutate(attr.id)}
                      className="ms-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newValues[group.id] ?? ""}
                  onChange={(e) => setNewValues((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  placeholder="Add value..."
                  className="max-w-xs text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (newValues[group.id] ?? "").trim()) {
                      addAttributeMutation.mutate({ groupId: group.id, value: newValues[group.id].trim() });
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const val = (newValues[group.id] ?? "").trim();
                    if (val) addAttributeMutation.mutate({ groupId: group.id, value: val });
                  }}
                  loading={addAttributeMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={generateVariants} variant="outline">
          <Zap className="me-2 h-4 w-4" />
          Generate Variants
        </Button>
        {generated && (
          <span className="text-sm text-gray-500">{variantRows.length} combination{variantRows.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {generated && variantRows.length > 0 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Variant Combinations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {groupCols.map((g) => (
                    <th key={g.id} className="pb-2 pe-4 font-medium text-gray-500">{g.name}</th>
                  ))}
                  <th className="pb-2 pe-4 font-medium text-gray-500">SKU</th>
                  <th className="pb-2 pe-4 font-medium text-gray-500">Price (DA)</th>
                  <th className="pb-2 pe-4 font-medium text-gray-500">Stock</th>
                  <th className="pb-2 font-medium text-gray-500">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variantRows.map((row, i) => (
                  <tr key={i}>
                    {row.attributeLabels.map((label, j) => (
                      <td key={j} className="py-2 pe-4">
                        <Badge variant="secondary">{label}</Badge>
                      </td>
                    ))}
                    <td className="py-2 pe-4">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateRow(i, "sku", e.target.value)}
                        placeholder="SKU"
                        className="w-28"
                      />
                    </td>
                    <td className="py-2 pe-4">
                      <Input
                        type="number"
                        min="0"
                        value={row.price}
                        onChange={(e) => updateRow(i, "price", e.target.value)}
                        placeholder="0"
                        className="w-24"
                      />
                    </td>
                    <td className="py-2 pe-4">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateRow(i, "stock", e.target.value)}
                        className="w-20"
                      />
                    </td>
                    <td className="py-2">
                      <Switch
                        checked={row.isActive}
                        onCheckedChange={(v) => updateRow(i, "isActive", v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={() => saveVariantsMutation.mutate(variantRows)}
              loading={saveVariantsMutation.isPending}
            >
              <Save className="me-2 h-4 w-4" />
              Save All Variants
            </Button>
          </div>
        </Card>
      )}

      {existingVariants.length > 0 && !generated && (
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold">Existing Variants ({existingVariants.length})</h2>
          <div className="space-y-2">
            {existingVariants.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {v.variantAttributes?.map((va: any) => (
                    <Badge key={va.attributeId} variant="secondary">
                      <span className="text-xs text-gray-400 me-1">{va.attribute?.group?.name}:</span>
                      {va.attribute?.value}
                    </Badge>
                  ))}
                </div>
                {v.sku && <span className="text-xs text-gray-400">SKU: {v.sku}</span>}
                {v.price != null && <span className="text-sm font-medium">{Number(v.price).toLocaleString()} DA</span>}
                <Badge variant={v.stock > 0 ? "success" : "destructive"}>{v.stock} in stock</Badge>
                <Badge variant={v.isActive ? "default" : "secondary"}>{v.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
