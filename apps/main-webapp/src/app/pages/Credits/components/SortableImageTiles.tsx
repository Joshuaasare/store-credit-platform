import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { cn } from "@store-credit-platform/web-components";

interface SortableImageTilesProps {
  images: string[];
  onReorder: (next: string[]) => void;
  onRemove: (url: string) => void;
}

function SortableTile({
  url,
  isCover,
  onRemove,
}: {
  url: string;
  isCover: boolean;
  onRemove: (url: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "border-border relative h-20 w-20 cursor-grab touch-none overflow-hidden rounded-md border",
        isDragging && "border-primary z-10 opacity-75",
      )}
      {...attributes}
      {...listeners}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
      {isCover && (
        <span className="bg-primary text-primary-foreground absolute bottom-1 left-1 rounded px-1 text-[10px] font-medium leading-4">
          Cover
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(url)}
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-background/80 absolute right-1 top-1 z-10 rounded-full p-0.5"
        aria-label="Remove image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SortableImageTiles({
  images,
  onReorder,
  onRemove,
}: SortableImageTilesProps) {
  // A small activation distance keeps plain clicks (e.g. remove) from
  // turning into drags.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = images.indexOf(String(active.id));
    const to = images.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(images, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images} strategy={rectSortingStrategy}>
        {images.map((url, index) => (
          <SortableTile
            key={url}
            url={url}
            isCover={index === 0 && images.length > 1}
            onRemove={onRemove}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}