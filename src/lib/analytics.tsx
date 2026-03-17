'use client';

import React from 'react';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function AnalyticsPageView(): React.JSX.Element | null {
  return null;
}

// Custom event tracking helpers
export const analytics = {
  track: (event: string, properties?: Record<string, unknown>) => {
    void event;
    void properties;
  },

  identify: (userId: string, traits?: Record<string, unknown>) => {
    void userId;
    void traits;
  },

  reset: () => {},

  // Feature flags
  isFeatureEnabled: (flag: string): boolean => {
    void flag;
    return false;
  },

  // Custom events for Family Planner
  events: {
    // Tasks
    taskCreated: (taskId: string, category?: string) => {
      analytics.track('task_created', { task_id: taskId, category });
    },
    taskCompleted: (taskId: string, timeSpent?: number) => {
      analytics.track('task_completed', { task_id: taskId, time_spent: timeSpent });
    },
    taskDeleted: (taskId: string) => {
      analytics.track('task_deleted', { task_id: taskId });
    },

    // Recipes
    recipeCreated: (recipeId: string, category?: string) => {
      analytics.track('recipe_created', { recipe_id: recipeId, category });
    },
    recipeViewed: (recipeId: string) => {
      analytics.track('recipe_viewed', { recipe_id: recipeId });
    },
    recipeCooked: (recipeId: string, servings?: number) => {
      analytics.track('recipe_cooked', { recipe_id: recipeId, servings });
    },

    // Shopping
    shoppingItemAdded: (itemName: string, category?: string) => {
      analytics.track('shopping_item_added', { item_name: itemName, category });
    },
    shoppingItemPurchased: (itemName: string) => {
      analytics.track('shopping_item_purchased', { item_name: itemName });
    },

    // Inventory
    inventoryItemAdded: (itemName: string, quantity: number) => {
      analytics.track('inventory_item_added', { item_name: itemName, quantity });
    },
    inventoryItemUsed: (itemName: string, quantity: number) => {
      analytics.track('inventory_item_used', { item_name: itemName, quantity });
    },

    // Schedule
    scheduleCreated: (scheduleId: string, type: string) => {
      analytics.track('schedule_created', { schedule_id: scheduleId, type });
    },

    // Meals
    mealPlanned: (mealId: string, mealType: string, date: string) => {
      analytics.track('meal_planned', { meal_id: mealId, meal_type: mealType, date });
    },

    // User engagement
    commandPaletteOpened: () => {
      analytics.track('command_palette_opened');
    },
    shortcutsHelpViewed: () => {
      analytics.track('shortcuts_help_viewed');
    },
    onboardingCompleted: (step: number) => {
      analytics.track('onboarding_completed', { step });
    },
    pwaInstalled: () => {
      analytics.track('pwa_installed');
    },

    // Exports
    dataExported: () => {
      analytics.track('data_exported');
    },
    accountDeleted: () => {
      analytics.track('account_deleted');
    },
  },
};

