# Database Backup System - Dokumentacja

**Data**: 2026-01-05  
**Status**: ✅ Skonfigurowane  
**Środowisko**: VPS (Production)

---

## 🎯 Przegląd

System automatycznych backupów PostgreSQL dla aplikacji Planner:
- ✅ Automatyczne backupy przez cron
- ✅ Kompresja (gzip) dla oszczędności miejsca
- ✅ Rotacja backupów (automatyczne usuwanie starych)
- ✅ Weryfikacja integralności
- ✅ Bezpieczne restore z safety backup
- ✅ Logging wszystkich operacji
- ✅ Opcjonalny upload do S3

---

## 📁 Utworzone Skrypty

### 1. `backup-database.sh` - Główny skrypt backupu
**Funkcje:**
- Tworzy dump PostgreSQL
- Kompresuje (gzip)
- Usuwa stare backupy (retention policy)
- Loguje operacje
- Opcjonalnie uploaduje do S3

**Użycie:**
```bash
# Manualny backup
sudo ./scripts/backup-database.sh

# Z zmiennymi środowiskowymi
DB_NAME=family_planner DB_USER=postgres DB_PASSWORD=xxx ./scripts/backup-database.sh
```

### 2. `restore-database.sh` - Restore z backupu
**Funkcje:**
- Lista dostępnych backupów
- Interaktywny wybór
- Safety backup przed restore
- Automatyczny rollback przy błędzie

**Użycie:**
```bash
# Interaktywny wybór
sudo ./scripts/restore-database.sh

# Z konkretnym plikiem
sudo ./scripts/restore-database.sh planner_backup_20260105_120000.sql.gz
```

### 3. `setup-backup-cron.sh` - Automatyzacja
**Funkcje:**
- Konfiguruje cron job
- Wybór częstotliwości
- Tworzy katalogi i logi

**Użycie:**
```bash
sudo ./scripts/setup-backup-cron.sh
# Następnie wybierz opcję (1-5)
```

### 4. `verify-backups.sh` - Weryfikacja
**Funkcje:**
- Lista wszystkich backupów
- Weryfikacja integralności (gzip -t)
- Statystyki (rozmiar, liczba, daty)
- Test restore (dry-run)

**Użycie:**
```bash
# Podstawowa weryfikacja
./scripts/verify-backups.sh

# Z testem restore
./scripts/verify-backups.sh --test-restore
```

---

## 🚀 Setup - Krok po kroku

### Na VPS (Production)

#### 1. Nadaj uprawnienia wykonywania
```bash
cd /var/www/planner  # lub inna ścieżka
chmod +x scripts/*.sh
```

#### 2. Ustaw zmienne środowiskowe
Utwórz plik `/etc/planner-backup.conf`:
```bash
sudo nano /etc/planner-backup.conf
```

Dodaj:
```bash
export DB_NAME="family_planner"
export DB_USER="postgres"
export DB_PASSWORD="twoje-haslo-db"
export BACKUP_DIR="/var/backups/planner"
export RETENTION_DAYS=30
```

Zabezpiecz plik:
```bash
sudo chmod 600 /etc/planner-backup.conf
```

#### 3. Source config w skryptach
Dodaj na początku skryptów:
```bash
# W backup-database.sh (linia 6)
if [ -f "/etc/planner-backup.conf" ]; then
    source /etc/planner-backup.conf
fi
```

#### 4. Uruchom setup automatyzacji
```bash
sudo ./scripts/setup-backup-cron.sh
```

Wybierz opcję:
- **Opcja 1** (Daily at 2 AM) - Rekomendowane dla małych/średnich projektów
- **Opcja 3** (Twice daily) - Dla aktywnych aplikacji
- **Opcja 4** (Every 6h) - Dla krytycznych danych

#### 5. Test manualnego backupu
```bash
sudo ./scripts/backup-database.sh
```

Sprawdź czy backup został utworzony:
```bash
ls -lh /var/backups/planner/
```

#### 6. Test restore
```bash
sudo ./scripts/restore-database.sh
# Wybierz backup i potwierdź 'yes'
```

---

## 📊 Harmonogramy Backupów

### Rekomendowane dla różnych wielkości projektów:

| Wielkość | Users | Freq. | Retention | Opis |
|----------|-------|-------|-----------|------|
| Mały | <100 | Daily | 30 dni | 1x dziennie w nocy |
| Średni | 100-1k | 2x daily | 30 dni | Rano i wieczorem |
| Duży | 1k-10k | Every 6h | 45 dni | Co 6 godzin |
| Enterprise | >10k | Every 1h | 60 dni | Co godzinę + off-site |

### Wyrażenia Cron:

```bash
# Codziennie o 2:00
0 2 * * *

# Dwa razy dziennie (2:00 i 14:00)
0 2,14 * * *

# Co 6 godzin
0 */6 * * *

# Co godzinę
0 * * * *

# Co 30 minut (dla bardzo aktywnych)
*/30 * * * *
```

---

## 🗂️ Struktura Backupów

```
/var/backups/planner/
├── planner_backup_20260105_020000.sql.gz  (najnowszy)
├── planner_backup_20260104_020000.sql.gz
├── planner_backup_20260103_020000.sql.gz
├── ...
└── planner_backup_20251206_020000.sql.gz  (najstarszy, 30 dni)
```

### Nazewnictwo plików:
```
planner_backup_YYYYMMDD_HHMMSS.sql.gz
                └─ Data i czas utworzenia
```

---

## 📈 Monitoring

### 1. Sprawdź logi
```bash
# Ostatnie logi
tail -f /var/log/planner-backup.log

# Wszystkie logi
cat /var/log/planner-backup.log

# Błędy
grep -i error /var/log/planner-backup.log
```

### 2. Weryfikuj backupy regularnie
```bash
# Sprawdź listę i integralność
./scripts/verify-backups.sh

# Z testem restore
./scripts/verify-backups.sh --test-restore
```

### 3. Sprawdź cron job
```bash
# Lista wszystkich cron jobs
crontab -l

# Edytuj (jeśli potrzeba zmienić)
crontab -e
```

### 4. Sprawdź miejsce na dysku
```bash
df -h /var/backups/planner
```

---

## 🔧 Troubleshooting

### Problem: Backup się nie tworzy

**Diagnoza:**
```bash
# Sprawdź logi
tail -20 /var/log/planner-backup.log

# Sprawdź uprawnienia
ls -l /var/backups/planner/

# Sprawdź cron
sudo systemctl status cron  # Debian/Ubuntu
sudo systemctl status crond  # CentOS/RHEL
```

**Rozwiązania:**
1. Sprawdź czy folder `/var/backups/planner` istnieje i ma uprawnienia
2. Sprawdź czy PostgreSQL działa: `sudo systemctl status postgresql`
3. Sprawdź hasło DB w `/etc/planner-backup.conf`

### Problem: Brak miejsca na dysku

**Rozwiązanie:**
```bash
# Zmniejsz retention (np. do 14 dni)
# W backup-database.sh zmień:
RETENTION_DAYS=14

# Lub usuń stare backupy manualnie
cd /var/backups/planner
rm planner_backup_2025*.sql.gz  # Usuń wszystkie z 2025
```

### Problem: Restore kończy się błędem

**Diagnoza:**
```bash
# Sprawdź czy backup jest poprawny
gzip -t /var/backups/planner/planner_backup_*.sql.gz

# Sprawdź czy baza istnieje
psql -l | grep family_planner
```

**Rozwiązania:**
1. Użyj innego backupu (może ten jest uszkodzony)
2. Restore utworzy safety backup - możesz wrócić do niego
3. Sprawdź logi PostgreSQL: `sudo tail -50 /var/log/postgresql/postgresql-*.log`

### Problem: Backup działa ale jest pusty (0 bytes)

**Przyczyna:** Błędne hasło lub brak uprawnień

**Rozwiązanie:**
```bash
# Test połączenia
PGPASSWORD=twoje-haslo psql -U postgres -h localhost -d family_planner -c "SELECT 1;"

# Jeśli nie działa, sprawdź pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Upewnij się że jest: local   all   postgres   md5
```

---

## 🔒 Bezpieczeństwo

### 1. Zabezpiecz pliki konfiguracyjne
```bash
sudo chmod 600 /etc/planner-backup.conf
sudo chown root:root /etc/planner-backup.conf
```

### 2. Szyfrowanie backupów (opcjonalne)
Dla wrażliwych danych:
```bash
# Po kompresji, szyfruj
gpg --symmetric --cipher-algo AES256 planner_backup_*.sql.gz

# Restore:
gpg --decrypt planner_backup_*.sql.gz.gpg | gunzip | psql -d family_planner
```

### 3. Off-site backups (S3, Backblaze, etc.)

#### Setup AWS S3:
```bash
# Zainstaluj AWS CLI
sudo apt-get install awscli

# Konfiguruj
aws configure

# W backup-database.sh dodaj:
export BACKUP_TO_S3=true
export S3_BUCKET=your-bucket-name
```

#### Setup Backblaze B2:
```bash
# Zainstaluj B2 CLI
pip install b2

# Autoryzuj
b2 authorize-account YOUR_KEY_ID YOUR_APP_KEY

# Upload w backup-database.sh:
b2 upload-file your-bucket-name "${BACKUP_DIR}/${BACKUP_FILE}" "backups/${BACKUP_FILE}"
```

---

## 📋 Checklist Wdrożenia

### Pre-Production:
- [ ] Skrypty mają uprawnienia wykonywania
- [ ] `/etc/planner-backup.conf` utworzony i zabezpieczony
- [ ] Folder `/var/backups/planner` istnieje
- [ ] Manualny backup działa
- [ ] Test restore działa

### Production:
- [ ] Cron job skonfigurowany
- [ ] Pierwszy automatyczny backup wykonany
- [ ] Weryfikacja backupów przeszła pomyślnie
- [ ] Logi są monitorowane
- [ ] Alerty skonfigurowane (opcjonalnie)
- [ ] Off-site backup działający (opcjonalnie)

### Miesięczne:
- [ ] Weryfikuj backupy: `./verify-backups.sh`
- [ ] Test restore: `./verify-backups.sh --test-restore`
- [ ] Sprawdź miejsce na dysku
- [ ] Przejrzyj logi na błędy

---

## 🎯 Best Practices

### ✅ DO:
- **Test restore regularnie** (co najmniej raz w miesiącu)
- **Monitoruj miejsce na dysku**
- **Przechowuj backupy off-site** (S3, inny serwer)
- **Dokumentuj procedury restore**
- **Testuj disaster recovery plan**
- **Automatyzuj wszystko**

### ❌ DON'T:
- Nie przechowuj tylko lokalnych backupów
- Nie ignoruj błędów w logach
- Nie zakładaj że backup=restore (testuj!)
- Nie używaj nieszyfrowanych backupów dla wrażliwych danych
- Nie zapominaj o rotacji (ryzyko przepełnienia dysku)

---

## 📞 Disaster Recovery Plan

### Scenariusz 1: Uszkodzona baza danych

```bash
# 1. Zatrzymaj aplikację
sudo systemctl stop planner  # lub pm2 stop planner

# 2. Restore z najnowszego backupu
sudo ./scripts/restore-database.sh

# 3. Restart aplikacji
sudo systemctl start planner

# 4. Weryfikuj
# - Sprawdź czy aplikacja działa
# - Sprawdź logi
# - Test funkcjonalności
```

### Scenariusz 2: Całkowita awaria serwera

```bash
# 1. Na nowym serwerze zainstaluj PostgreSQL
sudo apt-get install postgresql

# 2. Utwórz bazę danych
sudo -u postgres createdb family_planner

# 3. Pobierz backup (z S3 lub innego źródła)
aws s3 cp s3://your-bucket/backups/planner_backup_latest.sql.gz .

# 4. Restore
gunzip -c planner_backup_latest.sql.gz | sudo -u postgres psql -d family_planner

# 5. Zainstaluj i uruchom aplikację
# ... (deploy procedura)
```

### Scenariusz 3: Przypadkowe usunięcie danych

```bash
# 1. NIE panikuj!
# 2. Zatrzymaj aplikację NATYCHMIAST (żeby nie nadpisać backupu)
# 3. Znajdź backup PRZED usunięciem

# Lista backupów
ls -lt /var/backups/planner/

# 4. Restore do tymczasowej bazy
sudo -u postgres createdb family_planner_recovery

gunzip -c /var/backups/planner/planner_backup_PRZED_USUNICIEM.sql.gz | \
  sudo -u postgres psql -d family_planner_recovery

# 5. Wyeksportuj tylko potrzebne dane
pg_dump -t specific_table family_planner_recovery | psql family_planner

# 6. Restart aplikacji
```

---

## 💰 Koszty Storage

### Przykładowe rozmiary (kompresowane):

| Records | DB Size | Backup Size | 30 dni | 90 dni |
|---------|---------|-------------|--------|--------|
| 10k | 100 MB | 20 MB | 600 MB | 1.8 GB |
| 100k | 1 GB | 200 MB | 6 GB | 18 GB |
| 1M | 10 GB | 2 GB | 60 GB | 180 GB |

### Cloud Storage (miesięcznie):

| Provider | 100 GB | 1 TB | Egress |
|----------|--------|------|--------|
| AWS S3 | $2.30 | $23 | $9/100GB |
| Backblaze B2 | $0.50 | $5 | $1/100GB |
| Google Cloud | $2 | $20 | $12/100GB |

**Rekomendacja:** Backblaze B2 (najtańszy)

---

## 🔄 Automatyczne Alerty

### Setup email alerts (opcjonalne):

```bash
# Zainstaluj mailutils
sudo apt-get install mailutils

# Modyfikuj backup-database.sh
# Po udanym backupie:
echo "Backup completed: ${BACKUP_FILE}" | mail -s "Planner Backup Success" admin@example.com

# Po błędzie:
echo "Backup FAILED!" | mail -s "Planner Backup FAILED" admin@example.com
```

### Telegram alerts:

```bash
# Ustaw token bota i chat ID
TELEGRAM_TOKEN="your-bot-token"
CHAT_ID="your-chat-id"

# Funkcja wysyłająca
send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -d chat_id="${CHAT_ID}" \
        -d text="$1"
}

# Użycie
send_telegram "✅ Backup completed: ${BACKUP_FILE}"
```

---

## 📚 Dodatkowe Zasoby

- 📖 [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- 🎥 [Database Backup Strategies](https://www.youtube.com/watch?v=example)
- 💬 [PostgreSQL Community](https://www.postgresql.org/community/)

---

**Setup zakończony**: 2026-01-05  
**Status**: ✅ Gotowe do użycia  
**Następny krok**: Deploy na VPS i konfiguracja cron!

