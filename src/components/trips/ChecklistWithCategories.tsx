"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Shirt,
  Smartphone,
  Droplet,
  Heart,
  MoreHorizontal
} from "lucide-react";

const categoryConfig = {
  DOCUMENTS: { label: "Dokumenty", icon: FileText, color: "text-blue-500" },
  CLOTHES: { label: "Ubrania", icon: Shirt, color: "text-purple-500" },
  ELECTRONICS: { label: "Elektronika", icon: Smartphone, color: "text-green-500" },
  TOILETRIES: { label: "Kosmetyki", icon: Droplet, color: "text-cyan-500" },
  MEDICINE: { label: "Apteczka", icon: Heart, color: "text-red-500" },
  OTHER: { label: "Inne", icon: MoreHorizontal, color: "text-gray-500" },
};

interface ChecklistItem {
  id: string;
  name: string;
  isPacked: boolean;
  category: keyof typeof categoryConfig | null;
}

interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

interface ChecklistWithCategoriesProps {
  checklist: Checklist;
  onToggleItem: (itemId: string, isPacked: boolean) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (name: string, category?: string) => void;
  onDelete: () => void;
}

export function ChecklistWithCategories({
  checklist,
  onToggleItem,
  onDeleteItem,
  onAddItem,
  onDelete,
}: ChecklistWithCategoriesProps) {
  const [newItemName, setNewItemName] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    DOCUMENTS: true,
    CLOTHES: true,
    ELECTRONICS: true,
    TOILETRIES: true,
    MEDICINE: true,
    OTHER: true,
  });

  // Group items by category
  const itemsByCategory = checklist.items.reduce((acc, item) => {
    const category = item.category || "OTHER";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Calculate stats
  const completedItems = checklist.items.filter(i => i.isPacked).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddItem(newItemName);
      setNewItemName("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{checklist.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{completedItems}/{totalItems}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              onClick={onDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Categories */}
        {Object.entries(categoryConfig).map(([categoryKey, config]) => {
          const items = itemsByCategory[categoryKey] || [];
          if (items.length === 0) return null;

          const categoryCompleted = items.filter(i => i.isPacked).length;
          const categoryTotal = items.length;
          const Icon = config.icon;

          return (
            <Collapsible
              key={categoryKey}
              open={expandedCategories[categoryKey]}
              onOpenChange={() => toggleCategory(categoryKey)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="font-medium text-sm">{config.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {categoryCompleted}/{categoryTotal}
                  </Badge>
                </div>
                {expandedCategories[categoryKey] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-6 pt-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group py-1">
                    <Checkbox
                      checked={item.isPacked}
                      onCheckedChange={(checked) => onToggleItem(item.id, !!checked)}
                    />
                    <span className={item.isPacked ? "line-through text-muted-foreground text-sm" : "text-sm"}>
                      {item.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {/* Add new item */}
        <form onSubmit={handleAddItem} className="flex gap-2 mt-3 pt-2 border-t">
          <Input
            placeholder="Dodaj rzecz..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
