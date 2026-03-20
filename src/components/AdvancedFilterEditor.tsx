"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Code } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventFilterConfig, FilterRule } from "@/lib/event-filter";
import { serializeEventFilter } from "@/lib/event-filter";

interface AdvancedFilterEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function AdvancedFilterEditor({ value, onChange }: AdvancedFilterEditorProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  // Simple mode
  const [keywords, setKeywords] = useState(value || "");

  // Advanced mode
  const [rules, setRules] = useState<FilterRule[]>([
    { field: "title", operator: "contains", value: "", caseSensitive: false },
  ]);
  const [logic, setLogic] = useState<"AND" | "OR">("OR");


  const addRule = () => {
    setRules([...rules, { field: "title", operator: "contains", value: "", caseSensitive: false }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<FilterRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const handleApply = () => {
    if (mode === "simple") {
      onChange(keywords);
    } else {
      const config: EventFilterConfig = {
        mode: "advanced",
        rules: rules.filter((r) => r.value.trim() !== ""),
        logic,
      };
      onChange(serializeEventFilter(config));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Zaawansowane Filtrowanie
        </CardTitle>
        <CardDescription>
          Filtruj wydarzenia według reguł lub wyrażeń regularnych
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v: string) => setMode(v as "simple" | "advanced")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Proste</TabsTrigger>
            <TabsTrigger value="advanced">Zaawansowane</TabsTrigger>
          </TabsList>

          {/* Simple Mode */}
          <TabsContent value="simple" className="space-y-4">
            <div className="space-y-2">
              <Label>Słowa kluczowe (oddzielone przecinkami)</Label>
              <Input
                placeholder="praca, spotkanie, meeting"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wydarzenia zawierające którekolwiek z tych słów zostaną zaimportowane
              </p>
            </div>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label>Logika łączenia reguł</Label>
              <Select value={logic} onValueChange={(v) => setLogic(v as "AND" | "OR")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OR">OR - którakolwiek reguła (zalecane)</SelectItem>
                  <SelectItem value="AND">AND - wszystkie reguły</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Reguły filtrowania</Label>
                <Button size="sm" variant="outline" onClick={addRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj regułę
                </Button>
              </div>

              {rules.map((rule, index) => (
                <Card key={index} className="p-4">
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Pole</Label>
                        <Select
                          value={rule.field}
                          onValueChange={(v) => updateRule(index, { field: v as FilterRule["field"] })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="title">Tytuł</SelectItem>
                            <SelectItem value="description">Opis</SelectItem>
                            <SelectItem value="location">Lokalizacja</SelectItem>
                            <SelectItem value="category">Kategoria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={rule.operator}
                          onValueChange={(v) => updateRule(index, { operator: v as FilterRule["operator"] })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contains">Zawiera</SelectItem>
                            <SelectItem value="equals">Równa się</SelectItem>
                            <SelectItem value="startsWith">Zaczyna się od</SelectItem>
                            <SelectItem value="endsWith">Kończy się na</SelectItem>
                            <SelectItem value="regex">Regex (wyrażenie)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Wartość</Label>
                      <Input
                        placeholder={rule.operator === "regex" ? "np. ^Spotkanie.*" : "np. praca"}
                        value={rule.value}
                        onChange={(e) => updateRule(index, { value: e.target.value })}
                        className="h-9"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.caseSensitive || false}
                          onCheckedChange={(checked) => updateRule(index, { caseSensitive: checked })}
                        />
                        <Label className="text-xs">Rozróżniaj wielkość liter</Label>
                      </div>

                      {rules.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Przykłady */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">💡 Przykłady regex:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>
                    <code>^Spotkanie</code> - zaczyna się od &quot;Spotkanie&quot;
                  </li>
                  <li>
                    <code>.*praca.*</code> - zawiera &quot;praca&quot; gdziekolwiek
                  </li>
                  <li>
                    <code>Meeting|Spotkanie</code> - zawiera &quot;Meeting&quot; LUB &quot;Spotkanie&quot;
                  </li>
                  <li>
                    <code>^\d{"{2}"}:\d{"{2}"}</code> - zaczyna się od godziny (np. &quot;14:30 Wywiad&quot;)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleApply}>Zastosuj filtr</Button>
        </div>
      </CardContent>
    </Card>
  );
}

