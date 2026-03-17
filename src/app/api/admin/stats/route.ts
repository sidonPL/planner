import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

/**
 * Admin Stats API
 * GET /api/admin/stats
 * Zwraca real-time statystyki dla admin dashboard
 */
export async function GET() {
  // Check admin auth
  const sessionOrError = await requireAdmin();
  if (sessionOrError instanceof NextResponse) {
    return sessionOrError;
  }

  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      // Users
      totalUsers,
      activeUsers,
      newUsers,
      adminCount,

      // Households
      totalHouseholds,

      // Gamification
      totalBadges,
      totalAchievements,

      // Recipes
      totalRecipes,
      publicRecipes,
      recipesWithImages,

      // Tasks
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,

      // Inventory
      totalInventoryItems,
      expiringSoon,

      // Notifications
      totalNotifications,
      unreadNotifications,

      // Audit logs
      totalAuditLogs,
      recentAuditLogs,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActivityDate: {
            gte: last7Days,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: last30Days,
          },
        },
      }),
      prisma.user.count({
        where: {
          role: 'ADMIN',
        },
      }),

      // Households
      prisma.household.count(),

      // Gamification
      prisma.userBadge.count(),
      prisma.achievement.count(),

      // Recipes
      prisma.recipe.count(),
      prisma.recipe.count({
        where: {
          // TODO: Add isPublic field to schema if not exists
          // isPublic: true,
        },
      }),
      prisma.recipe.count({
        where: {
          image: {
            not: null,
          },
        },
      }),

      // Tasks
      prisma.task.count(),
      prisma.task.count({
        where: {
          status: {
            not: 'COMPLETED',
          },
        },
      }),
      prisma.taskCompletion.count(),
      prisma.task.count({
        where: {
          dueDate: {
            lt: now,
          },
          status: {
            not: 'COMPLETED',
          },
        },
      }),

      // Inventory
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Notifications
      prisma.notification.count(),
      prisma.notification.count({
        where: {
          isRead: false,
        },
      }),

      // Audit logs
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: last7Days,
          },
        },
      }),
    ]);

    // Calculate metrics
    const taskCompletionRate = totalTasks > 0
      ? (completedTasks / totalTasks) * 100
      : 0;

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        admins: adminCount,
      },
      households: {
        total: totalHouseholds,
      },
      gamification: {
        totalXP: 0, // Will be calculated when userProgress model exists
        totalBadges: totalBadges,
        totalAchievements: totalAchievements,
        activeStreaks: 0, // Will be calculated when streak model exists
      },
      recipes: {
        total: totalRecipes,
        public: publicRecipes,
        withImages: recipesWithImages,
        imagesPercentage: totalRecipes > 0
          ? Math.round((recipesWithImages / totalRecipes) * 100)
          : 0,
      },
      tasks: {
        total: totalTasks,
        active: activeTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        completionRate: Math.round(taskCompletionRate),
      },
      inventory: {
        total: totalInventoryItems,
        expiringSoon,
        expiringPercentage: totalInventoryItems > 0
          ? Math.round((expiringSoon / totalInventoryItems) * 100)
          : 0,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      audit: {
        total: totalAuditLogs,
        recent: recentAuditLogs,
      },
      system: {
        timestamp: now.toISOString(),
        uptime: process.uptime(),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}


