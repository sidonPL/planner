 mi#!/bin/bash

# 🚀 SZYBKIE POLECENIA DO SKOPIOWANIA NA VPS
# Skopiuj poniższe bloki i wklej w terminalu SSH

# ============================================================================
# CZĘŚĆ 1: PRZYGOTOWANIE
# ============================================================================

ssh root@planner.sidon.pl

cd /var/www/planner

# Wyłącz aplikację
pm2 stop all
pm2 flush

# Backup
cp ecosystem.config.js ecosystem.config.js.backup

# ============================================================================
# CZĘŚĆ 2: UTWÓRZ PLIK start-with-migrations.js
# ============================================================================

cat > start-with-migrations.js << 'SCRIPT'
#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}]${colors.reset} ${message}`);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
      } else {
        resolve();
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  try {
    log('🚀 Uruchamianie Plannera z migracją bazy danych...', 'cyan');

    log('📦 Sprawdzanie zależności...', 'yellow');
    if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
      log('Instaluję zależności npm...', 'yellow');
      await runCommand('npm', ['install']);
    }

    log('🔧 Generowanie klienta Prismy...', 'yellow');
    await runCommand('npm', ['run', 'db:generate']);

    log('🔄 Uruchamianie migracji bazy danych...', 'yellow');
    try {
      await runCommand('npm', ['run', 'db:migrate']);
      log('✅ Migracje zakończone pomyślnie', 'green');
    } catch (error) {
      log(`⚠️ Migracja nie powiodła się: ${error.message}`, 'red');
      log('Kontynuuję start aplikacji...', 'yellow');
    }

    log('ℹ️ Status migracji:', 'yellow');
    try {
      await runCommand('npm', ['run', 'db:migrate:status']);
    } catch (error) {
      log('Nie udało się sprawdzić statusu migracji', 'yellow');
    }

    log('🏗️ Budowanie aplikacji Next.js...', 'yellow');
    await runCommand('npm', ['run', 'build']);
    log('✅ Build zakończony', 'green');

    log('⚡ Uruchamianie aplikacji za pomocą PM2...', 'yellow');
    exec('pm2 --version', (error) => {
      if (error) {
        log('⚠️ PM2 nie jest zainstalowany', 'yellow');
        runCommand('npm', ['start']);
      } else {
        exec('pm2 start ecosystem.config.js --update-env', { cwd: ROOT_DIR }, (error) => {
          if (error) {
            log(`❌ Błąd PM2: ${error.message}`, 'red');
            process.exit(1);
          }
          log('✨ Aplikacja uruchomiona!', 'green');
        });
      }
    });
  } catch (error) {
    log(`❌ BŁĄD: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
SCRIPT

chmod +x start-with-migrations.js
echo "✅ Plik start-with-migrations.js utworzony"

# ============================================================================
# CZĘŚĆ 3: AKTUALIZUJ ecosystem.config.js
# ============================================================================

echo "
⚠️  WAŻNE: Otwórz ecosystem.config.js i dodaj na SAMYM POCZĄTKU apps array:

nano ecosystem.config.js

Dodaj to na lini 2 (zaraz po apps: [):

{
  name: 'prisma-migrate',
  script: 'npx',
  args: 'prisma migrate deploy',
  cwd: './',
  instances: 1,
  exec_mode: 'fork',
  autorestart: false,
  watch: false,
  env: {
    NODE_ENV: 'production',
  },
  error_file: './logs/migrate-error.log',
  out_file: './logs/migrate-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  kill_timeout: 30000,
},

Zapisz: Ctrl+X, Y, Enter
"

# ============================================================================
# CZĘŚĆ 4: URUCHOM MIGRACJE
# ============================================================================

npm run db:migrate
npm run db:migrate:status

# ============================================================================
# CZĘŚĆ 5: ZBUDUJ I URUCHOM
# ============================================================================

npm run build
pm2 restart ecosystem.config.js --update-env
pm2 status

# ============================================================================
# CZĘŚĆ 6: SPRAWDŹ
# ============================================================================

echo "
✅ Migracje zainstalowane!

Sprawdzaj logi:
  pm2 logs planner-app

Testuj:
  curl http://localhost:3000/api/health

Następnym razem uruchom:
  npm run start:migrate
"

pm2 logs planner-app

