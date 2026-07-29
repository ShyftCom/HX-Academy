"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableItem({ id, children, className }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-white/10"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(className)}>
      {children(dragHandle)}
    </div>
  );
}
