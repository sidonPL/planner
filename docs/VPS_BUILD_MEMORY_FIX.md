# 🔧 Rozwiązanie: "JavaScript Heap Out of Memory" podczas budowania na VPS

## Problem
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

Błąd pojawia się podczas `npm run build` (TypeScript checking + Next.js build) na VPS z ograniczoną pamięcią RAM.

---

## 🎯 Szybkie Rozwiązania

### ✅ Opcja 1: Wznów build z wyższym limitem pamięci (TERAZ)

Jeśli proces się zawiesił, wznów go z ręcznym limitem:

```bash
# Zwiększ limit pamięci Node.js do 4GB
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Lub bardziej konserwatywnie (1.5GB):
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

---

### ✅ Opcja 2: Zwiększ dostępną pamięć poprzez SWAP (jeśli VPS ma mało RAM)

Zanim powtórzysz build:

```bash
# Utwórz 4GB SWAP
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Dodaj do fstab, żeby utrzymał się po rebootie
sudo echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Verify:
```bash
free -h
```

---

### ✅ Opcja 3: Automatyczne (Rekomendowane) — zaktualizuj `scripts/install-vps.sh`

Skrypt został zaktualizowany, aby **automatycznie** szacować dostępną pamięć i ustawić `NODE_OPTIONS` dla Node.js.

Przy kolejnej instalacji:
```bash
sudo ./scripts/install-vps.sh \
  --domain planner.sidon.pl \
  --email admin@sidon.pl \
  --repo-url https://github.com/...
```

Skrypt sam ustawia `NODE_OPTIONS='--max-old-space-size=X'` na podstawie RAM dostępnego na VPS-ie.

---

## 📊 Typowe wartości `--max-old-space-size`

| RAM Dostępna | Rekomendacja | max-old-space-size |
|---|---|---|
| 512 MB | Zbyt mało | 256-512 |
| 1 GB | OK (+ SWAP) | 512 |
| 2 GB | Dobrze | 1024-1536 |
| 4 GB | Idealnie | 2048-4096 |
| 8+ GB | Bez problemu | 4096+ |

---

## 🔍 Diagnoza: Sprawdź dostępną pamięć

```bash
# Całkowita RAM
free -h

# Tylko dostępna RAM
free -h | awk 'NR==2{print $7}'

# Wykorzystanie (w %):
free | awk 'NR==2{print int($3/$2 * 100)}'
```

---

## 🛠️ Dodatkowe Optymalizacje

### 1. Wyłącz TypeScript checking (jeśli wiesz, że kod się kompiluje)

W `.env.production.local` (tymczasowo):
```bash
# Pomiń ESLint + TypeScript podczas devloop
# SKIP_ESLINT=true
# SKIP_TSCHECKING=true
```

### 2. Zwiększ VM Swappiness (pozwól na więcej SWAP)

```bash
sudo sysctl vm.swappiness=60
```

### 3. Podziel build na etapy w Dockerfile

```dockerfile
# Stage 1: Instalacja
FROM node:20-alpine AS installer
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build (oddzielnie, z więcej RAM)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Stage 3: Runtime (minimal)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY package*.json ./
RUN npm ci --only=production
CMD ["npm", "start"]
```

---

## 📝 Checklist po Rozwiązaniu

- [ ] Build skończył się bez błędu (exit code 0)
- [ ] Sprawdź `.next` folder istnieje: `ls -la .next/`
- [ ] Uruchom aplikację: `npm start`
- [ ] Test endpoint: `curl http://localhost:3000`
- [ ] Sprawdź PM2: `pm2 status`

---

## ⚠️ Najczęstsze Błędy

| Błąd | Przyczyna | Rozwiązanie |
|---|---|---|
| `SIGABRT` + OOM | Node.js wyczerpał heap | `NODE_OPTIONS="--max-old-space-size=4096"` |
| `npm ERR! code ENOMEM` | Zbyt wiele procesów | `npm ci` zamiast `npm install` |
| Build trwa 5+ min | Brak optymalizacji | Dodaj SWAP, zwiększ RAM lub limit heap |
| Timeout | Serwer jest unresponsive | Restart VPS, sprawdź inne procesy |

---

## 📚 Dodatkowe Materiały

- [Next.js Build Performance](https://nextjs.org/docs/advanced-features/production-builds)
- [Node.js Memory](https://nodejs.org/en/docs/guides/nodejs-on-serverless-platforms/#why)
- [VPS Memory Guide](../../docs/VPS_DEPLOYMENT.md)

