# Yapı Kredi Başvuru Demo

Next.js başvuru akışı + CRM paneli.

## Yerel geliştirme

```bash
npm install
npm run dev
```

- Uygulama: http://localhost:3000
- CRM: http://localhost:3000/crm (şifre: `admin123`)

## Cloudflare Workers

```bash
npm run deploy
```

Gerekli ortam değişkenleri (Cloudflare secret):

- `CRM_PASSWORD` — CRM giriş şifresi
- `SMS_MOCK` — `true` ise OTP ekranda gösterilir

KV binding: `APP_STORE` (wrangler.jsonc içinde tanımlı)
