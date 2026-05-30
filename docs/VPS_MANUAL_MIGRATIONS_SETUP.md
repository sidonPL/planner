# 🔧 Ręczne dodanie migracji na starej wersji VPS

Jeśli Twoja wersja na VPS nie ma jeszcze tych zmian, postępuj według tych kroków.

---

## ⚡ SZYBKI SETUP (5 minut)

```bash
# 1. Zaloguj się na VPS
ssh root@planner.sidon.pl

# 2. Przejdź do projektu
cd /var/www/planner

# 3. Wyłącz aplikację
pm2 stop all
pm2 flush

# 4. Utwórz backup (na wszelki wypadek)
cp ecosystem.config.js ecosystem.config.js.backup

# 5. Pobrania pliki ręcznie (patrz: KROK PO KROKU poniżej)

# 6. Uruchom migracje
npm run db:migrate
npm run db:migrate:status

# 7. Zbuduj i uruchom
npm run build
pm2 restart ecosystem.config.js --update-env

# 8. Sprawdź
pm2 logs planner-app
```

---

## 📋 KROK PO KROKU

### KROK 1️⃣: Zaloguj się na VPS

```bash
ssh root@planner.sidon.pl
cd /var/www/planner
```

### KROK 2️⃣: Wyłącz aplikację

```bash
pm2 stop all
pm2 flush
pm2 delete all
```

### KROK 3️⃣: Utwórz backup

```bash
cp ecosystem.config.js ecosystem.config.js.backup
echo "✅ Backup: ecosystem.config.js.backup"
```

### KROK 4️⃣: Uaktualnij `ecosystem.config.js`

Otwórz plik i **na samym początku** dodaj nowe zadanie migracji:

```bash
nano ecosystem.config.js
```

**Dodaj to na SAMYM POCZĄTKU `apps` array (linia 2):**

```javascript
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
```

**WAŻNE:** Wstaw to PRZED istniejącym `planner-app`. Plik powinien wyglądać tak:

```javascript
module.exports = {
  apps: [
    {
      name: 'prisma-migrate',
      // ... nowa konfiguracja ...
    },
    {
      name: 'planner-app',
      // ... istniejąca konfiguracja ...
    },
    // ... reszta cron jobów ...
  ]
}
```

Zapisz: `Ctrl+X`, `Y`, `Enter`

### KROK 5️⃣: Utwórz plik `start-with-migrations.js`

```bash
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
    try {
      exec('pm2 --version', (error) => {
        if (error) {
          log('⚠️ PM2 nie jest zainstalowany, uruchamiam aplikację bezpośrednio...', 'yellow');
          runCommand('npm', ['start']);
        } else {
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
EOF

chmod +x start-with-migrations.js
```

### KROK 6️⃣: Uruchom migracje ręcznie

```bash
npm run db:migrate
npm run db:migrate:status
```

Powinieneś zobaczyć:
```
All migrations have been applied
```

### KROK 7️⃣: Zbuduj aplikację

```bash
npm run build
```

### KROK 8️⃣: Uruchom PM2

```bash
pm2 start ecosystem.config.js --update-env
pm2 status
```

### KROK 9️⃣: Sprawdź logi

```bash
pm2 logs planner-app
```

Powinieneś zobaczyć:
```
> ready started server on 0.0.0.0:3000
```

### KROK 🔟: Testuj aplikację

```bash
curl http://localhost:3000/api/health
# Powinno zwrócić: OK
```

---

## ✅ Jeśli wszystko działa

```bash
# Przywróć z backup jeśli coś poszło nie tak
cp ecosystem.config.js.backup ecosystem.config.js
pm2 restart all
```

---

## 🎯 Następnym razem

Użyj nowego skryptu:

```bash
npm run start:migrate
```

Lub tradycyjnie:

```bash
npm run deploy:prod
```

---

## ⚠️ Troubleshooting

### Problem: "Command not found: npm"

```bash
# Sprawdź Node.js
node --version
npm --version

# Jeśli nie ma, zainstaluj Node.js
curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### Problem: "Table does not exist"

```bash
# Sprawdź status migracji
npm run db:migrate:status

# Jeśli są niezastosowane:
npm run db:migrate

# Przebuduj
npm run build

# Zrestartuj
pm2 restart all
```

### Problem: "Cannot connect to database"

```bash
# Sprawdź .env
cat .env | grep DATABASE

# Testuj połączenie
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "SELECT 1"

# Sprawdź PostgreSQL
sudo systemctl status postgresql
```

### Problem: "PM2 not found"

Zainstaluj PM2:
```bash
npm install -g pm2
pm2 startup
pm2 save
```

---

## 📊 Monitorowanie

```bash
# Logi migracji
pm2 logs prisma-migrate

# Logi aplikacji
pm2 logs planner-app

# Wszystkie logi
pm2 logs

# Status
pm2 status
```

---

## 🎓 Co się zmieniło

| Co | Przed | Po |
|---|---|---|
| Migracje | Ręcznie | Automatyczne |
| Start | `pm2 start ecosystem.config.js` | `npm run start:migrate` |
| Deploy | `npm run deploy:prod` | `npm run deploy:prod` (zawiera migracje) |
| Logi migracji | Brak | `logs/migrate-*.log` |

---

**Status: ✅ GOTOWE** 

Teraz migracje będą uruchamiane automatycznie za każdym razem! 🎉

