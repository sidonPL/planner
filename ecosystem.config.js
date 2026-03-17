module.exports = {
  apps: [
    {
      name: 'planner-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1, // Dla VPS z ograniczonymi zasobami - 1 instancja. Można zwiększyć do 'max' lub liczby rdzeni CPU
      exec_mode: 'fork', // 'cluster' dla wielu instancji
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Rotacja logów
      log_type: 'json',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    // Cron: Task reminders - co 15 minut
    {
      name: 'cron-task-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/task-reminders'
      ],
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Schedule reminders - co 5 minut
    {
      name: 'cron-schedule-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/schedule-reminders'
      ],
      cron_restart: '*/5 * * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Meal reminders - co 10 minut
    {
      name: 'cron-meal-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/meal-reminders'
      ],
      cron_restart: '*/10 * * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Calendar sync - co godzinę
    {
      name: 'cron-calendar-sync',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/calendar-sync'
      ],
      cron_restart: '0 * * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Event reminders - codziennie o 7:00
    {
      name: 'cron-event-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/event-reminders'
      ],
      cron_restart: '0 7 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Birthday reminders - codziennie o 8:00
    {
      name: 'cron-birthday-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/birthday-reminders'
      ],
      cron_restart: '0 8 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Anniversary reminders - codziennie o 8:00
    {
      name: 'cron-anniversary-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/anniversary-reminders'
      ],
      cron_restart: '0 8 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Inventory alerts - codziennie o 18:00
    {
      name: 'cron-inventory-alerts',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/inventory-alerts'
      ],
      cron_restart: '0 18 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Trip reminders - codziennie o 8:00
    {
      name: 'cron-trip-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/trip-reminders'
      ],
      cron_restart: '0 8 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Routine reminders - co godzinę
    {
      name: 'cron-routine-reminders',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/routine-reminders'
      ],
      cron_restart: '0 * * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Generate routine instances - codziennie o 00:00
    {
      name: 'cron-generate-routine-instances',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/generate-routine-instances'
      ],
      cron_restart: '0 0 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Daily routine digest - codziennie o 7:00
    {
      name: 'cron-daily-routine-digest',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/daily-routine-digest'
      ],
      cron_restart: '0 7 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Weekly reports - w poniedziałek o 9:00
    {
      name: 'cron-weekly-reports',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/weekly-reports'
      ],
      cron_restart: '0 9 * * 1',
      autorestart: false,
      watch: false,
    },
    // Cron: Monthly reports - 1. dnia miesiąca o 10:00
    {
      name: 'cron-monthly-reports',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/monthly-reports'
      ],
      cron_restart: '0 10 1 * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Auto restock - codziennie o 6:00
    {
      name: 'cron-auto-restock',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/auto-restock'
      ],
      cron_restart: '0 6 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Task escalation - codziennie o 12:00
    {
      name: 'cron-task-escalation',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/task-escalation'
      ],
      cron_restart: '0 12 * * *',
      autorestart: false,
      watch: false,
    },
    // Cron: Daily Quests - codziennie o północy (00:00)
    {
      name: 'cron-daily-quests',
      script: 'curl',
      args: [
        '-X', 'GET',
        '-H', `Authorization: Bearer ${process.env.CRON_SECRET}`,
        'http://localhost:3000/api/cron/daily-quests'
      ],
      cron_restart: '0 0 * * *',
      autorestart: false,
      watch: false,
      error_file: './logs/cron-daily-quests-error.log',
      out_file: './logs/cron-daily-quests-out.log',
    },
  ],
};

