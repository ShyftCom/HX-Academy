"use client";

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";

/**
 * Generic drag-and-drop reorder list built on @dnd-kit (installed since the
 * project's start but never actually wired up anywhere — every existing
 * "reorder" affordance in the admin was a decorative, non-functional grip/
 * chevron icon). Reused across the Showcase Website admin: page sections,
 * programme schedule rows, FAQs, header nav items, footer columns, gallery
 * images, pathway levels, news categories.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, dragHandle: React.ReactNode, index: number) => React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              {(dragHandle) => renderItem(item, dragHandle, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
