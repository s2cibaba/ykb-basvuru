# Yapı Kredi Başvuru Demo

Next.js başvuru akışı + CRM paneli.

## Yerel geliştirme

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

- Uygulama: http://localhost:3000
- CRM: http://localhost:3000/crm (şifre: `admin123`)

## Cloudflare Workers

Push to `master` → **Cloudflare Workers Builds** (GitHub bağlı) otomatik deploy eder.

Build: `npm run build` (Next + OpenNext `postbuild`) → Deploy: `wrangler deploy`

Manuel deploy:

```bash
npm run deploy
```

- Başvuru: https://yapikredi.online
- CRM (yalnızca): https://ykb-basvuru.workers.dev/crm

Custom domainlerde `/crm` kapalıdır (404).

### Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `CRM_PASSWORD` | CRM giriş şifresi (secret) |
| `ADMIN_HOST` | CRM host (`ykb-basvuru.workers.dev`) |
| `SUPABASE_URL` | Supabase proje URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (secret) |

KV binding: `APP_STORE` (Supabase yoksa fallback)

### USOM failover

- CRM → **USOM / Domain**: kontrol, otomatik failover toggle, Telegram test, failover geçmişi
- Cron (30 dk): GitHub Actions `.github/workflows/usom-cron.yml` — repo secret `CRON_SECRET` gerekli
- Yedek domainler: `kredibasvuru.org`, `kredifirsatlari.org`, `ekonomikbakis.org`

**Yedek domain Cloudflare bağlama** (zone Dashboard'dan eklendikten sonra):

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... SPACESHIP_API_KEY=... SPACESHIP_API_SECRET=... \
  npm run domains:onboard -- kredibasvuru.org kredifirsatlari.org ekonomikbakis.org
```

Sonra `wrangler.jsonc` routes'a apex+www ekle ve `npm run deploy`.

Subdomain failover (`v1.domain.org`) için `scripts/onboard-domains.mjs` ile tek hostname Worker'a bağlanır.

### Supabase migration

Service role key **DDL çalıştıramaz** (sadece Data API). Tabloları oluşturmak için:

1. **SQL editör** (tek seferlik): [SQL Editor](https://supabase.com/dashboard/project/lgjwhkhrtxsvydgwqphz/sql/new) → `supabase/migrations/001_initial.sql` içeriğini yapıştır → Run

2. **CLI** (database password ile):

```bash
$env:SUPABASE_DB_PASSWORD="your-db-password"
npm run db:migrate
```

Proje: `https://lgjwhkhrtxsvydgwqphz.supabase.co`
