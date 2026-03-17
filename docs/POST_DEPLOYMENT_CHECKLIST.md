# Post-Deployment Checklist

Po wdrożeniu aplikacji na VPS, przejdź przez tę checklistę aby upewnić się, że wszystko działa poprawnie.

## ✅ Podstawowe Sprawdzenia

### 1. Aplikacja Działa
- [ ] Aplikacja odpowiada na `http://localhost:3000`
- [ ] Aplikacja odpowiada przez domenę (jeśli skonfigurowana)
- [ ] SSL/HTTPS działa poprawnie (jeśli skonfigurowane)
- [ ] Przekierowanie HTTP → HTTPS działa

### 2. Health Check
```bash
curl http://localhost:3000/api/health
```
- [ ] Status: 200 OK
- [ ] Database: connected
- [ ] Response time < 500ms

### 3. PM2 Status
```bash
pm2 status
```
- [ ] Proces `planner-app` jest **online**
- [ ] Restarts: niska liczba (< 5)
- [ ] Memory usage: < 500MB (na start)
- [ ] Uptime: stabilny

### 4. Logi
```bash
pm2 logs planner-app --lines 50
```
- [ ] Brak error-ów krytycznych
- [ ] Aplikacja startuje bez problemów
- [ ] Połączenie z bazą danych OK

## 🗄️ Baza Danych

### 5. Połączenie
```bash
psql -U user -d dbname -c "SELECT COUNT(*) FROM \"User\";"
```
- [ ] Połączenie działa
- [ ] Tabele istnieją
- [ ] Dane są dostępne (jeśli migrowane)

### 6. Migracje
```bash
npx prisma migrate status
```
- [ ] Wszystkie migracje applied
- [ ] Brak pending migrations

### 7. Backup
```bash
./backup-db.sh
```
- [ ] Backup tworzy się poprawnie
- [ ] Plik backup znajduje się w `backups/`
- [ ] Rozmiar pliku > 0

## 🔒 Bezpieczeństwo

### 8. Environment Variables
```bash
cat .env | grep -v '#' | grep '='
```
- [ ] `NEXTAUTH_SECRET` ustawiony (długi, losowy)
- [ ] `CRON_SECRET` ustawiony
- [ ] `DATABASE_URL` poprawny
- [ ] Brak wrażliwych danych w repo (sprawdź .gitignore)

### 9. Firewall
```bash
sudo ufw status
```
- [ ] UFW włączony
- [ ] Port 22 (SSH) otwarty
- [ ] Port 80 (HTTP) otwarty
- [ ] Port 443 (HTTPS) otwarty
- [ ] Port 3000 ZAMKNIĘTY (dostęp tylko przez nginx)

### 10. SSL Certificate (jeśli używasz)
```bash
sudo certbot certificates
```
- [ ] Certyfikat aktywny
- [ ] Ważny > 30 dni
- [ ] Auto-renewal skonfigurowane

## 🔧 Funkcjonalność

### 11. Rejestracja/Logowanie
- [ ] Rejestracja nowego użytkownika działa
- [ ] Logowanie działa
- [ ] Email activation (jeśli włączone)
- [ ] Forgot password działa

### 12. Podstawowe Funkcje
- [ ] Dashboard ładuje się poprawnie
- [ ] Można utworzyć zadanie
- [ ] Można dodać przepis
- [ ] Można zarządzać gospodarstwem domowym
- [ ] Notyfikacje działają

### 13. CRON Jobs
Sprawdź czy CRON jobs uruchamiają się:
```bash
pm2 logs cron-daily-quests --lines 20
```
- [ ] CRON jobs są zarejestrowane w PM2
- [ ] Logi pokazują wykonanie
- [ ] Brak błędów autoryzacji (401)

Ręczny test CRON:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/task-reminders
```
- [ ] Status: 200 OK
- [ ] Bez CRON_SECRET dostajemy 401

### 14. Upload Plików
- [ ] Katalog `public/uploads/` istnieje
- [ ] Uprawnienia zapisu: `chmod 755 public/uploads/`
- [ ] Upload awatara działa
- [ ] Upload obrazów przepisów działa

## 📊 Monitoring

### 15. Resource Usage
```bash
pm2 monit
```
- [ ] CPU: < 50% w idle
- [ ] Memory: < 500MB w idle
- [ ] Brak memory leaks (obserwuj przez kilka godzin)

### 16. Database Performance
```bash
# W psql
EXPLAIN ANALYZE SELECT * FROM "Task" WHERE "householdId" = 'xxx';
```
- [ ] Query time < 50ms dla podstawowych zapytań
- [ ] Indeksy działają (index scan, nie sequential)

### 17. Monitoring Script
```bash
./monitor.sh
```
- [ ] Wszystkie checks przechodzą
- [ ] Script można dodać do cron

## 🔄 Backup & Recovery

### 18. Automated Backup
Dodaj do crontab:
```bash
crontab -e
# Dodaj linię:
0 2 * * * cd /var/www/planner && ./backup-db.sh >> logs/backup.log 2>&1
```
- [ ] Cron backup skonfigurowany
- [ ] Pierwszy backup wykonany
- [ ] Retention (7 dni) działa

### 19. Test Recovery
```bash
./restore-db.sh backups/your_backup.sql.gz
```
- [ ] Restore działa poprawnie
- [ ] Dane są kompletne po restore
- [ ] Safety backup tworzony przed restore

## 🚀 Performance

### 20. Page Load Speed
Użyj Google Lighthouse lub:
```bash
curl -o /dev/null -s -w 'Total: %{time_total}s\n' http://localhost:3000
```
- [ ] First load < 3s
- [ ] Subsequent loads < 1s
- [ ] API responses < 500ms

### 21. Caching
Sprawdź response headers:
```bash
curl -I http://localhost:3000/_next/static/...
```
- [ ] Cache-Control headers obecne
- [ ] Static files mają długi cache (max-age)
- [ ] Service Worker działa (w DevTools)

## 📱 PWA

### 22. Progressive Web App
- [ ] manifest.json dostępny
- [ ] Service Worker rejestruje się
- [ ] Można "Add to Home Screen"
- [ ] Działa offline (basic functionality)
- [ ] Push notifications działają (jeśli włączone)

## 🔔 Alerts & Notifications

### 23. Email Notifications
- [ ] SMTP skonfigurowane (jeśli używane)
- [ ] Test email się wysyła
- [ ] Przypomnienia o zadaniach działają

### 24. Push Notifications
- [ ] VAPID keys skonfigurowane
- [ ] Push subscription działa
- [ ] Notyfikacje dochodą do przeglądarki

## 📝 Documentation

### 25. Dokumentacja
- [ ] README.md zaktualizowany
- [ ] .env.example zawiera wszystkie potrzebne zmienne
- [ ] VPS_DEPLOYMENT.md jest aktualny
- [ ] Hasła/klucze dokumentowane (w bezpiecznym miejscu!)

## 🎯 Final Checks

### 26. Stability Test
Pozostaw aplikację włączoną przez 24h:
- [ ] Brak restartów PM2 (sprawdź restart count)
- [ ] Memory stable (brak wzrostu)
- [ ] Logi czyste (brak error-ów)
- [ ] Health check zawsze 200 OK

### 27. Load Test (opcjonalne)
Użyj narzędzia jak Apache Bench lub k6:
```bash
ab -n 1000 -c 10 http://localhost:3000/
```
- [ ] Aplikacja wytrzymuje 100+ concurrent users
- [ ] Response times stabilne
- [ ] Brak error 500

### 28. Security Scan
```bash
npm audit
```
- [ ] Brak critical vulnerabilities
- [ ] High/Medium vulnerabilities addressed lub acknowledged

## ✨ Nice to Have

### 29. Dodatki
- [ ] Google Analytics / PostHog skonfigurowane
- [ ] Error tracking (Sentry) włączony
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] CDN dla static assets (opcjonalne)

### 30. Maintenance Plan
- [ ] Scheduled maintenance window zdefiniowany
- [ ] Update procedure documented
- [ ] Rollback procedure tested
- [ ] Contact list w razie problemów

---

## 🎉 Gotowe!

Jeśli wszystkie powyższe punkty są ✅, Twoja aplikacja jest gotowa do użytku produkcyjnego!

**Następne kroki:**
1. Monitoruj przez pierwszy tydzień
2. Zbieraj feedback od użytkowników
3. Optymalizuj na podstawie rzeczywistego użycia
4. Planuj regularne aktualizacje

**Pamiętaj:**
- Regularnie sprawdzaj logi
- Aktualizuj zależności co miesiąc
- Testuj backupy co tydzień
- Monitoruj zasoby serwera

---

*Data wdrożenia: _____________*  
*Wdrożona wersja: _____________*  
*Odpowiedzialny: _____________*

