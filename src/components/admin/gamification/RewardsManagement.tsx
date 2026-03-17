'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
} from 'lucide-react';
import type { RewardCategory, RewardRarity } from '@prisma/client';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: RewardCategory;
  pointsCost: number;
  rarity: RewardRarity;
  requiredLevel: number | null;
  requiredAchievementId: string | null;
  stock: number | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  effectData: Record<string, unknown> | null;
  isActive: boolean;
  _count?: {
    claims: number;
  };
}

const categoryLabels: Record<RewardCategory, string> = {
  AVATAR: '👤 Avatar',
  BADGE: '🏅 Odznaka',
  TITLE: '👑 Tytuł',
  PERK: '⚡ Perk',
  THEME: '🎨 Motyw',
  PHYSICAL: '🎁 Fizyczna',
  OTHER: '📦 Inne',
};

const rarityLabels: Record<RewardRarity, { label: string; color: string }> = {
  COMMON: { label: 'Częste', color: 'bg-gray-500' },
  RARE: { label: 'Rzadkie', color: 'bg-blue-500' },
  EPIC: { label: 'Epiczne', color: 'bg-purple-500' },
  LEGENDARY: { label: 'Legendarne', color: 'bg-yellow-500' },
};

const emptyReward = {
  name: '',
  description: '',
  icon: '🎁',
  category: 'OTHER' as RewardCategory,
  pointsCost: 100,
  rarity: 'COMMON' as RewardRarity,
  requiredLevel: null as number | null,
  requiredAchievementId: null as string | null,
  stock: null as number | null,
  availableFrom: null as Date | null,
  availableUntil: null as Date | null,
  effectData: {},
  isActive: true,
};

export function RewardsManagement() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState(emptyReward);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data);
      } else {
        toast.error('Nie udało się załadować nagród');
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      toast.error('Błąd podczas ładowania nagród');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData(emptyReward);
    setSelectedReward(null);
    setEditDialog(true);
  };

  const handleEdit = (reward: Reward) => {
    setFormData({
      name: reward.name,
      description: reward.description || '',
      icon: reward.icon,
      category: reward.category,
      pointsCost: reward.pointsCost,
      rarity: reward.rarity,
      requiredLevel: reward.requiredLevel,
      requiredAchievementId: reward.requiredAchievementId,
      stock: reward.stock,
      availableFrom: reward.availableFrom,
      availableUntil: reward.availableUntil,
      effectData: reward.effectData || {},
      isActive: reward.isActive,
    });
    setSelectedReward(reward);
    setEditDialog(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const url = selectedReward
        ? `/api/admin/rewards/${selectedReward.id}`
        : '/api/admin/rewards';

      const method = selectedReward ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedReward ? 'Nagroda zaktualizowana' : 'Nagroda utworzona');
        setEditDialog(false);
        loadRewards();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Błąd podczas zapisywania nagrody');
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast.error('Błąd podczas zapisywania nagrody');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReward) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/admin/rewards/${selectedReward.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Nagroda usunięta');
        setDeleteDialog(false);
        loadRewards();
      } else {
        const error = await response.json();
        toast.error(error.message || error.error || 'Nie udało się usunąć nagrody');
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('Błąd podczas usuwania nagrody');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Ładowanie nagród...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Zarządzanie Nagrodami
              </CardTitle>
              <CardDescription>
                Twórz, edytuj i usuwaj nagrody dostępne w sklepie
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Nagrodę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{reward.icon}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{reward.name}</h4>
                        <Badge
                          variant="outline"
                          className={`${rarityLabels[reward.rarity].color} text-white text-xs mt-1`}
                        >
                          {rarityLabels[reward.rarity].label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(reward)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedReward(reward);
                          setDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kategoria:</span>
                    <Badge variant="secondary">{categoryLabels[reward.category]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Koszt:</span>
                    <div className="flex items-center gap-1 text-yellow-600 font-medium">
                      <Star className="h-3 w-3 fill-current" />
                      {reward.pointsCost} XP
                    </div>
                  </div>
                  {reward._count && reward._count.claims > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Odebrano:</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {reward._count.claims}x
                      </div>
                    </div>
                  )}
                  {reward.stock !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Zapas:</span>
                      <span className="font-medium">{reward.stock}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={reward.isActive ? 'default' : 'secondary'}>
                      {reward.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {rewards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak nagród. Kliknij &quot;Dodaj Nagrodę&quot; aby utworzyć pierwszą.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReward ? 'Edytuj Nagrodę' : 'Dodaj Nową Nagrodę'}
            </DialogTitle>
            <DialogDescription>
              {selectedReward
                ? 'Zmień szczegóły nagrody'
                : 'Utwórz nową nagrodę dostępną w sklepie'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Motyw Premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Ikona</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🎁"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opisz nagrodę..."
                rows={3}
              />
            </div>

            {/* Category & Rarity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as RewardCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rarity">Rzadkość</Label>
                <Select
                  value={formData.rarity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rarity: value as RewardRarity })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rarityLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost & Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointsCost">Koszt (XP) *</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  min={1}
                  value={formData.pointsCost}
                  onChange={(e) =>
                    setFormData({ ...formData, pointsCost: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Zapas</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={formData.stock || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Nielimitowane"
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requiredLevel">Wymagany poziom</Label>
                <Input
                  id="requiredLevel"
                  type="number"
                  min={1}
                  value={formData.requiredLevel || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiredLevel: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Brak"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredAchievement">ID osiągnięcia</Label>
                <Input
                  id="requiredAchievement"
                  value={formData.requiredAchievementId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiredAchievementId: e.target.value || null,
                    })
                  }
                  placeholder="Brak"
                />
              </div>
            </div>

            {/* Effect Data - Only for PERK category */}
            {formData.category === 'PERK' && (
              <div className="space-y-2">
                <Label>Dane efektu (JSON)</Label>
                <Textarea
                  value={JSON.stringify(formData.effectData, null, 2)}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      setFormData({ ...formData, effectData: data });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={4}
                  placeholder='{"type": "xp_boost", "multiplier": 1.25, "duration": 86400}'
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Dla XP Boost: {`{"type": "xp_boost", "multiplier": 1.25, "duration": 86400}`}
                </p>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Aktywna</Label>
                <p className="text-sm text-muted-foreground">
                  Czy nagroda jest widoczna w sklepie
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisywanie...' : selectedReward ? 'Zapisz' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć nagrodę?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Nagroda &quot;{selectedReward?.name}&quot; zostanie trwale
              usunięta.
              {selectedReward?._count && selectedReward._count.claims > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm font-medium">
                    ⚠️ Ta nagroda została odebrana {selectedReward._count.claims} razy. Nie będzie
                    można jej usunąć.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Usuwanie...' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

