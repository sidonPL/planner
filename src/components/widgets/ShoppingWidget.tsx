"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShoppingItem } from "@prisma/client";

interface ShoppingWidgetProps {
  items: ShoppingItem[];
  totalCount: number;
}

export function ShoppingWidget({ items, totalCount }: ShoppingWidgetProps) {
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim() }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setLocalItems([newItem, ...localItems]);
        setNewItemName("");
        toast.success(`Dodano "${newItem.name}" do listy zakupów`);
      } else {
        toast.error("Nie udało się dodać produktu");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Lista zakupów</CardTitle>
          <CardDescription>{totalCount + (localItems.length - items.length)} produktów</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/shopping">
            Zobacz listę
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Szybkie dodawanie */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <Input
            placeholder="Dodaj produkt..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
            disabled={isAdding}
          />
          <Button type="submit" size="icon" disabled={isAdding || !newItemName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Lista produktów */}
        {localItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Lista zakupów jest pusta</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {localItems.slice(0, 8).map((item) => (
              <Badge
                key={item.id}
                variant={item.isUrgent ? "destructive" : "secondary"}
              >
                {item.name}
                {item.quantity && ` (${item.quantity}${item.unit || ""})`}
              </Badge>
            ))}
            {localItems.length > 8 && (
              <Badge variant="outline">+{localItems.length - 8} więcej</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

