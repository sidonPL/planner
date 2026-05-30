#!/bin/bash

# ============================================================================
# INSTRUKCJA: Ręczne dodanie automatycznych migracji na VPS
# ============================================================================
#
# Wykonaj te kroki na VPS, jeśli nie masz najnowszego kodu z repozytorium
#

echo "🚀 Uruchamianie procesu aktualizacji migracji na VPS..."

# KROK 1: Zaloguj się na VPS
echo "
📍 KROK 1: Zaloguj się na VPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh root@planner.sidon.pl

# KROK 2: Przejdź do folderu projektu
echo "
📍 KROK 2: Przejdź do folderu projektu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/planner
pwd

# KROK 3: Wyłącz aplikację
echo "
📍 KROK 3: Wyłącz aplikację
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 stop all
pm2 flush

# KROK 4: Utwórz backup ecosystem.config.js
echo "
📍 KROK 4: Utwórz backup ecosystem.config.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cp ecosystem.config.js ecosystem.config.js.backup
echo "✅ Backup created: ecosystem.config.js.backup"

# KROK 5: Zastąp ecosystem.config.js
echo "
📍 KROK 5: Zastąp ecosystem.config.js (zawiera zadanie migracji)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Skopiuj zawartość z nowego ecosystem.config.js
(patrz: instrukcja poniżej)
"

# KROK 6: Utwórz nowy skrypt start-with-migrations.js
echo "
📍 KROK 6: Utwórz nowy skrypt start-with-migrations.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cat > start-with-migrations.js << 'EOF'
#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(\`\${colors[color]}[\${timestamp}]\${colors.reset} \${message}\`);
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
        reject(new Error(\`Command \"\${command} \${args.join(' ')}\" exited with code \${code}\`));
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
      log(\`⚠️ Migracja nie powiodła się: \${error.message}\`, 'red');
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
    try {
      exec('pm2 --version', (error) => {
        if (error) {
          log('⚠️ PM2 nie jest zainstalowany, uruchamiam aplikację bezpośrednio...', 'yellow');
          runCommand('npm', ['start']);
        } else {
          exec('pm2 start ecosystem.config.js --update-env', { cwd: ROOT_DIR }, (error) => {
            if (error) {
              log(\`❌ Błąd PM2: \${error.message}\`, 'red');
              process.exit(1);
            }
            log('✨ Aplikacja uruchomiona za pomocą PM2!', 'green');
            log('Logi: pm2 logs', 'cyan');
          });
        }
      });
    } catch (error) {
      log(\`❌ Błąd: \${error.message}\`, 'red');
      process.exit(1);
    }
  } catch (error) {
    log(\`❌ BŁĄD: \${error.message}\`, 'red');
    process.exit(1);
  }
}

main();
EOF

chmod +x start-with-migrations.js
echo '✅ Plik start-with-migrations.js utworzony'
"

# KROK 7: Uruchom migracje
echo "
📍 KROK 7: Uruchom migracje ręcznie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run db:migrate
npm run db:migrate:status

# KROK 8: Zbuduj aplikację
echo "
📍 KROK 8: Zbuduj aplikację
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run build

# KROK 9: Uruchom aplikację
echo "
📍 KROK 9: Uruchom aplikację
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 restart ecosystem.config.js --update-env
pm2 status

# KROK 10: Sprawdź logi
echo "
📍 KROK 10: Sprawdź logi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pm2 logs planner-app

echo "
✨ Gotowe!

Następnym razem uruchom:
  npm run start:migrate

Lub tradycyjnie:
  npm run deploy:prod
"

