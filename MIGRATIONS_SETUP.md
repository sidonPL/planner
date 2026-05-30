# 🚀 SZYBKI PORADNIK - Automatyczne Migracje

## Co się zmieniło?

✅ **ecosystem.config.js** - Dodano dedykowane zadanie migracji  
✅ **package.json** - Nowy skrypt `npm run start:migrate`  
✅ **3 nowe skrypty startowe** - Dla różnych systemów operacyjnych  

---

## 🎯 Jak zainstalować na produkcji (VPS)

```bash
# 1. Zaloguj się na VPS
ssh root@planner.sidon.pl

# 2. Przejdź do projektu
cd /var/www/planner

# 3. Pobierz najnowszy kod
git pull origin main

# 4. Zainstaluj zależności (jeśli są nowe)
npm install

# 5. OPCJA A: Użyj nowego skryptu (REKOMENDOWANA)
npm run start:migrate

# LUB OPCJA B: Tradycyjny deploy
npm run deploy:prod

# LUB OPCJA C: Ręczne kroki
npm run db:migrate
npm run build
pm2 restart ecosystem.config.js --update-env

# 6. Sprawdź status
pm2 status

# 7. Obejrzyj logi
pm2 logs planner-app
```

---

## 🔍 Testy

### Sprawdź czy migracje działają

```bash
# Na VPS
cd /var/www/planner

# Sprawdź status migracji
npm run db:migrate:status

# Powinien pokazać: "All migrations have been applied"
```

### Sprawdź logowanie

```bash
# Wejdź w aplikację
curl http://localhost:3000/api/health

# Powinno zwrócić OK
```

---

## 📊 Monitoring

### Logi migracji
```bash
pm2 logs prisma-migrate
```

### Logi aplikacji
```bash
pm2 logs planner-app
```

### Status
```bash
npm run status
# lub
pm2 status
```

---

## ⚠️ Jeśli coś pójdzie nie tak

### Błąd: "Table does not exist"

```bash
# Sprawdź status
npm run db:migrate:status

# Jeśli są niezastosowane migracje
npm run db:migrate

# Przebuduj
npm run build

# Zrestartuj
pm2 restart all
```

### Błąd: "Cannot connect to database"

```bash
# Sprawdź zmienne .env
cat .env | grep DATABASE

# Testuj połączenie
psql -U $DATABASE_USER -d $DATABASE_NAME -h localhost -c "SELECT 1"

# Sprawdź PostgreSQL
sudo systemctl status postgresql
```

### Aplikacja nie startuje

```bash
# Wyłącz aplikację
pm2 stop all

# Sprawdź logi
pm2 logs

# Usuń stare logi
pm2 flush

# Zrestartuj
pm2 start ecosystem.config.js --update-env
```

---

## 📋 Checklist wdrożenia

- [ ] Git pull (pobierz najnowszy kod)
- [ ] npm install (jeśli są nowe dependencje)
- [ ] npm run start:migrate (automatyczna migracja i start)
- [ ] pm2 status (sprawdź czy aplikacja żyje)
- [ ] pm2 logs planner-app (sprawdź logi)
- [ ] curl http://localhost:3000/api/health (test API)
- [ ] npm run db:migrate:status (sprawdź migracje)

---

## 🎓 Wyjaśnienie

**Czemu tych zmian?**

Stary problem: Jeśli migracja się nie wykonała, aplikacja uruchamiała się z błędami.

**Nowe rozwiązanie:** Teraz:
1. Migracje uruchamiają się PRZED startem aplikacji
2. Jeśli migracja się nie uda, aplikacja się nie uruchomi
3. Wszystko jest zalogowane
4. Łatwo debugować błędy

---

## 📞 Potrzebujesz pomocy?

Jeśli coś się nie udało:

1. Sprawdź logi: `pm2 logs`
2. Sprawdź status: `npm run db:migrate:status`
3. Uruchom ręcznie: `npm run db:migrate && npm run build`
4. Sprawdź połączenie z bazą: `psql -U user -d database`

---

**Gotowe! 🎉 Migracje będą się teraz uruchamiać automatycznie.**

