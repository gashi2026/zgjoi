# Zgjoi — si ta ngresh online

Ky është një projekt Next.js 14 (App Router). Nuk ka bazë të dhënash dhe as
backend — të gjitha të dhënat vijnë nga skedarët në `lib/`. Kjo do të thotë se
mund të ngrihet online pa konfigurim shtesë.

---

## 1. Provoje lokalisht (5 minuta)

Të duhet Node.js 18.17 ose më i ri: https://nodejs.org

```bash
cd zgjoi
npm install
npm run dev
```

Hape http://localhost:3000

Për të provuar versionin e prodhimit:

```bash
npm run build
npm start
```

Nëse `npm run build` kalon pa gabime, deploy-i do të kalojë gjithashtu.

---

## 2. Ngrite online me Vercel (rekomandohet)

Vercel është kompania që e ndërton Next.js; plani falas mjafton për demo.

### Varianti A — përmes GitHub (më i mirë për punë të vazhdueshme)

1. Krijo një repo të ri në https://github.com/new (p.sh. `zgjoi`).
2. Nga dosja e projektit:

```bash
git init
git add .
git commit -m "Zgjoi — versioni i parë"
git branch -M main
git remote add origin https://github.com/EMRI-YT/zgjoi.git
git push -u origin main
```

3. Shko te https://vercel.com → **Add New → Project** → lidh llogarinë e
   GitHub → zgjidh repo-n `zgjoi`.
4. Vercel e njeh vetë Next.js. Mos ndrysho asgjë:
   - Framework: **Next.js**
   - Build command: `next build`
   - Output: automatik
   - Environment variables: **asnjë**
5. Kliko **Deploy**. Pas ~2 minutash merr një adresë si
   `https://zgjoi.vercel.app`.

Çdo `git push` më vonë e rifreskon faqen automatikisht.

### Varianti B — pa GitHub, direkt nga kompjuteri

```bash
npm i -g vercel
cd zgjoi
vercel
```

Përgjigju pyetjeve (`Set up and deploy? Y`, scope-i yt, emri i projektit).
Për versionin publik final:

```bash
vercel --prod
```

---

## 3. Alternativa

| Host | Si |
|---|---|
| **Netlify** | New site → import repo → build: `npm run build`, publish: `.next`, shto plugin-in zyrtar `@netlify/plugin-nextjs` |
| **Cloudflare Pages** | Framework preset: Next.js, build: `npm run build` |
| **Render / Railway** | Web Service → build: `npm install && npm run build`, start: `npm start` |
| **VPS (Hetzner, DigitalOcean)** | `npm ci && npm run build && npm start` pas një reverse proxy si Nginx; përdor `pm2` për ta mbajtur gjallë |

---

## 4. Domeni yt (p.sh. zgjoi.com)

1. Blej domenin (Namecheap, Cloudflare, GoDaddy…).
2. Në Vercel: **Project → Settings → Domains → Add** → shkruaj domenin.
3. Te regjistruesi i domenit shto rekordet që të jep Vercel:
   - `A` për `@` → `76.76.21.21`
   - `CNAME` për `www` → `cname.vercel-dns.com`
4. Prit 5–60 minuta. HTTPS vendoset automatikisht.

---

## 5. Çfarë funksionon dhe çfarë jo

**Funksionon plotësisht (pamje dhe ndërveprim):**
- Të 34 faqet, navigimi, kërkimi me filtra, ballina me rripat e hojeve
- Formularët me validim, hapat e regjistrimit, kalkulimi i komisionit
- Bisedat: mesazhi që shkruan shfaqet menjëherë

**Nuk funksionon ende (kërkon backend):**
- Ruajtja e të dhënave — çdo rifreskim i kthen gjërat në gjendjen fillestare
- Hyrja/regjistrimi: nuk ka llogari reale dhe **asnjë faqe nuk është e mbrojtur**
  — `/admin` hapet nga kushdo që di adresën
- Pagesat: forma e kartës është vetëm pamje, nuk lidhet me asnjë procesor
- Emailet, njoftimet, ngarkimi i dokumenteve

> **Backend-i tashmë është ndërtuar** — shih `BACKEND.md` për ngritjen e
> bazës së të dhënave, autentikimit, pagesave dhe mbështetjes live.

### Hapat e radhës kur të vendosësh ta bësh real
1. **Auth** — Clerk, Auth.js ose Supabase Auth; pastaj mbroji `/admin`, `/pro/*`
   dhe `/llogaria/*` me middleware.
2. **Bazë të dhënash** — Supabase, Neon ose PlanetScale; zëvendëso
   `lib/data.ts`, `lib/account.ts`, `lib/admin.ts` me thirrje reale.
3. **Pagesat** — Stripe Connect (escrow + komision automatik) ose një ofrues i
   licencuar në Kosovë. Mos i prek kurrë të dhënat e kartës vetë.
4. **Ligji** — mbajtja e parave të klientëve është veprimtari e rregulluar.
   Konsulto një jurist para se të pranosh pagesa reale.

---

## 6. Ku ndryshohen gjërat më të shpeshta

| Çfarë | Skedari |
|---|---|
| Komisioni (15%) | vetëm `KOMISIONI` në `lib/account.ts` — faqet publike nuk e përmendin shifrën |
| Kategoritë, qytetet, profesionistët | `lib/data.ts` |
| Pyetjet e formularit sipas kategorisë | `lib/wizard.ts` |
| Ngjyrat e markës | `tailwind.config.ts` |
| Hojet në ballinë | `components/Honeycomb.tsx` |
| Rripat lëvizës | `components/Marquee.tsx` |
| Teksti i ballinës | `components/Hero.tsx` |
