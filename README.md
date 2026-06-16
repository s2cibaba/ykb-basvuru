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

Canlı adres: https://ykb-basvuru.s2cibaba.workers.dev

Özel domain: `yapikredi.online` (nameserver ayarı sonrası)

Gerekli ortam değişkenleri (Cloudflare secret):

- `CRM_PASSWORD` — CRM giriş şifresi
- `SMS_MOCK` — `true` ise OTP ekranda gösterilir

KV binding: `APP_STORE` (wrangler.jsonc içinde tanımlı)

## yapikredi.online domain bağlama

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Add a site** → `yapikredi.online`
2. Free plan seçin
3. Cloudflare size **2 nameserver** gösterecek — bunları domain satıcınızda (registrar) yapıştırın
4. Nameserver yayılımı 5 dk – 48 saat sürebilir; Cloudflare’da zone **Active** olunca:
5. `npm run deploy` ile Worker’ı yeniden deploy edin

Hesabınızdaki diğer domainler şu nameserver çiftlerinden birini kullanıyor (yeni zone için Cloudflare’ın gösterdiğini kullanın):

- `logan.ns.cloudflare.com` + `sharon.ns.cloudflare.com`
- `devin.ns.cloudflare.com` + `surina.ns.cloudflare.com`
