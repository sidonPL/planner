#!/usr/bin/env node

/**
 * Skrypt do uruchomienia migracji Prismy i startowania aplikacji
 * Zamiast polega na PM2, sam zarządza procesem
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;

// Kolory dla logów
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

    // Jeśli jest input (stdin), wyślij go
    if (options.input) {
      proc.stdin.write(options.input);
      proc.stdin.end();
    }

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

    // 1. Sprawdź node_modules
    log('📦 Sprawdzanie zależności...', 'yellow');
    if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
      log('Instaluję zależności npm...', 'yellow');
      await runCommand('npm', ['install']);
    }

    // 2. Generuj klienta Prismy
    log('🔧 Generowanie klienta Prismy...', 'yellow');
    await runCommand('npm', ['run', 'db:generate']);

    // 3. Uruchom migracje
    log('🔄 Uruchamianie migracji bazy danych...', 'yellow');
    try {
      await runCommand('npm', ['run', 'db:migrate']);
      log('✅ Migracje zakończone pomyślnie', 'green');
    } catch (error) {
      log(`⚠️ Migracja nie powiodła się: ${error.message}`, 'red');
      // Nie przerywaj - aplikacja może być już w dobry stanie
      log('Kontynuuję start aplikacji...', 'yellow');
    }

    // 3.5. Uruchom dodatkowe migracje SQL
    const tripPhotosPath = path.join(ROOT_DIR, 'prisma/migrations/add_trip_photos.sql');
    if (fs.existsSync(tripPhotosPath)) {
      log('📸 Uruchamianie migracji TripPhoto...', 'yellow');
      try {
        const sqlContent = fs.readFileSync(tripPhotosPath, 'utf-8');
        await runCommand('npx', ['prisma', 'db', 'execute', '--stdin'], {
          input: sqlContent,
          stdio: ['pipe', 'inherit', 'inherit'],
        });
        log('✅ Migracja TripPhoto uruchomiona', 'green');
      } catch (error) {
        log(`⚠️ Migracja TripPhoto: ${error.message}`, 'yellow');
        // Nie przerywaj - tabela może już istnieć
      }
    }

    // 4. Sprawdź status migracji
    log('ℹ️ Status migracji:', 'yellow');
    try {
      await runCommand('npm', ['run', 'db:migrate:status']);
    } catch (error) {
      log('Nie udało się sprawdzić statusu migracji', 'yellow');
    }

    // 5. Zbuduj aplikację
    log('🏗️ Budowanie aplikacji Next.js...', 'yellow');
    await runCommand('npm', ['run', 'build']);
    log('✅ Build zakończony', 'green');

    // 6. Uruchom PM2
    log('⚡ Uruchamianie aplikacji za pomocą PM2...', 'yellow');
    try {
      // Sprawdź czy PM2 jest zainstalowany
      exec('pm2 --version', (error) => {
        if (error) {
          log('⚠️ PM2 nie jest zainstalowany, uruchamiam aplikację bezpośrednio...', 'yellow');
          // Uruchom aplikację bezpośrednio
          runCommand('npm', ['start']);
        } else {
          // Uruchom za pomocą PM2
          exec('pm2 start ecosystem.config.js --update-env', { cwd: ROOT_DIR }, (error) => {
            if (error) {
              log(`❌ Błąd PM2: ${error.message}`, 'red');
              process.exit(1);
            }
            log('✨ Aplikacja uruchomiona za pomocą PM2!', 'green');
            log('Logi: pm2 logs', 'cyan');
          });
        }
      });
    } catch (error) {
      log(`❌ Błąd: ${error.message}`, 'red');
      process.exit(1);
    }
  } catch (error) {
    log(`❌ BŁĄD: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();



