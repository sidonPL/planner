'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Medal,
  Target,
  Users,
  Activity,
  Settings,
  Zap,
  Clock,
  Gift,
} from 'lucide-react';
import { AdminStatsOverview } from '@/components/admin/gamification/AdminStatsOverview';
import { AchievementsManagement } from '@/components/admin/gamification/AchievementsManagement';
import { QuestTemplatesManagement } from '@/components/admin/gamification/QuestTemplatesManagement';
import { CronJobMonitoring } from '@/components/admin/gamification/CronJobMonitoring';
import { NotificationSettings } from '@/components/admin/gamification/NotificationSettings';
import { BulkOperations } from '@/components/admin/gamification/BulkOperations';
import { RewardsManagement } from '@/components/admin/gamification/RewardsManagement';

export function AdminGamificationClient() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Admin Panel - Gamifikacja
          </h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj osiągnięciami, questami i monitoruj system
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Zap className="h-4 w-4 mr-2" />
          Admin Mode
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Osiągnięcia</span>
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Nagrody</span>
          </TabsTrigger>
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Questy</span>
          </TabsTrigger>
          <TabsTrigger value="cron" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Cron Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Medal className="h-4 w-4" />
            <span className="hidden sm:inline">Powiadomienia</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <AdminStatsOverview />
        </TabsContent>

        {/* Achievements Management */}
        <TabsContent value="achievements" className="space-y-4">
          <AchievementsManagement />
        </TabsContent>

        {/* Rewards Management */}
        <TabsContent value="rewards" className="space-y-4">
          <RewardsManagement />
        </TabsContent>

        {/* Quest Templates */}
        <TabsContent value="quests" className="space-y-4">
          <QuestTemplatesManagement />
        </TabsContent>

        {/* Cron Job Monitoring */}
        <TabsContent value="cron" className="space-y-4">
          <CronJobMonitoring />
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        {/* Bulk Operations */}
        <TabsContent value="bulk" className="space-y-4">
          <BulkOperations />
        </TabsContent>
      </Tabs>
    </div>
  );
}

