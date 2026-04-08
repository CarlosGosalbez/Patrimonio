"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, GripVertical } from "lucide-react";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoriesMutation,
} from "@/hooks/useCategories";
import { toast } from "sonner";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/categories/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  name: string;
  color?: string | null;
  onDelete: () => void;
}

function SortableItem({ id, name, color, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg border bg-background p-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-move touch-none rounded-md p-1 hover:bg-accent focus-visible:ring-2"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        {color && (
          <div className="h-6 w-6 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}
        <span className="font-medium">{name}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CategoryManager() {
  const t = useTranslations("categories");
  const tCommon = useTranslations("common");
  const categoriesQuery = useCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const reorderMutation = useReorderCategoriesMutation();

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLORS[0]);
  const [isIncome, setIsIncome] = useState(false);
  const nameId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categories = categoriesQuery.data || [];
  const expenses = categories.filter((c) => !c.is_income && !c.is_system);
  const incomes = categories.filter((c) => c.is_income && !c.is_system);

  async function handleCreate() {
    if (!name.trim()) return toast.error(t("nameRequired"));
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        color,
        is_income: isIncome,
        sort_order: categories.length,
      });
      toast.success(t("created"));
      setShowDialog(false);
      setName("");
      setColor(DEFAULT_CATEGORY_COLORS[0]);
      setIsIncome(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("createError"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t("deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteError"));
    }
  }

  async function handleDragEnd(event: DragEndEvent, isIncomeType: boolean) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = isIncomeType ? incomes : expenses;
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const updates = reordered.map((cat, index) => ({
      id: cat.id,
      sort_order: index,
    }));

    try {
      await reorderMutation.mutateAsync({ updates });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteError"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("expenses")}</CardTitle>
            <CardDescription>{t("expensesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noCustomCategories")}</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, false)}
              >
                <SortableContext
                  items={expenses.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {expenses.map((cat) => (
                      <SortableItem
                        key={cat.id}
                        id={cat.id}
                        name={cat.name}
                        color={cat.color}
                        onDelete={() => handleDelete(cat.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("income")}</CardTitle>
            <CardDescription>{t("incomeDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {incomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noCustomCategories")}</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, true)}
              >
                <SortableContext
                  items={incomes.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {incomes.map((cat) => (
                      <SortableItem
                        key={cat.id}
                        id={cat.id}
                        name={cat.name}
                        color={cat.color}
                        onDelete={() => handleDelete(cat.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor={nameId}>{t("name")}</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="mt-2"
                maxLength={50}
              />
            </div>
            <div>
              <Label>{t("color")}</Label>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {DEFAULT_CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="relative h-10 w-10 rounded-full transition-transform hover:scale-110 focus-visible:ring-2"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("type")}</Label>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant={!isIncome ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsIncome(false)}
                >
                  {t("expense")}
                </Button>
                <Button
                  type="button"
                  variant={isIncome ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsIncome(true)}
                >
                  {t("income")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? tCommon("processing") : tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
