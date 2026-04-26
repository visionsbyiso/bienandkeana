# Keana & Bien — Wedding E-vite

A premium, mobile-first wildflower e-vite for **Bien & Keana** · *Saturday, June 13, 2026*.

- Champagne-cream paper · Petit Formal Script + Libre Caslon Text
- Cinematic vellum-envelope intro
- Direct open RSVP form backed by Google Sheets
- Vanilla HTML/CSS/JS · no build step

---

## 1. Quick preview (local)

```bash
cd "Keana & Bien"
python3 -m http.server 8000
# open http://localhost:8000
```

Open the RSVP section and fill out:
- guest full name
- attending yes/no
- approved plus one yes/no
- plus one full name (if applicable)
- optional message

When `EVITE_CONFIG.appsScriptUrl` is set (Step 2 below), submissions are written directly to your Google Sheet.

---

## 2. RSVP setup (Google Sheet + Apps Script)

### 2a. Create the Sheet

1. Create a new Google Sheet (any name — e.g. *Keana & Bien RSVPs*).
2. Rename Sheet 1 to **`RSVPs`** (case-sensitive).
3. Paste this header row exactly into row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `Name` | `Attending` | `HasPlusOne` | `PlusOneName` | `Message` | `SubmittedAt` |

4. Add your guests starting on row 2. Example:

| Name | Attending | HasPlusOne | PlusOneName | Message | SubmittedAt |
|---|---|---|---|---|---|
| Coleen Reyes | Yes | No |  | Looking forward to your day |  |
| Keith Anthony Cruz | Yes | Yes | Maria Santos | Excited to celebrate |  |
| Juan Dela Cruz | No | No |  | Sending love |  |

**Column reference**

- `Name` — guest full name (typed directly by guest)
- `Attending` — `Yes` or `No`
- `HasPlusOne` — `Yes` or `No`
- `PlusOneName` — full name of approved plus one (optional)
- `Message` — optional note from guest
- `SubmittedAt` — timestamp from the script

### 2b. Deploy the Apps Script Web App

1. In your Sheet: **Extensions → Apps Script**
2. Replace the default `Code.gs` content with the contents of [`apps-script/Code.gs`](apps-script/Code.gs)
3. Save (cmd/ctrl+S)
4. Click **Deploy → New deployment**
5. Choose type: **Web app**
6. Settings:
   - *Description*: `Keana & Bien RSVP`
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (required for unauthenticated form posts)
7. Click **Deploy**, authorize the app when prompted
8. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfycb…/exec`)

### 2c. Wire it up

Open [`assets/config.js`](assets/config.js) and paste your URL:

```js
appsScriptUrl: "https://script.google.com/macros/s/AKfycb…/exec",
```

Reload the site. Form submissions write directly into your sheet.

> **Updating the script later**: every time you change `Code.gs`, you must redeploy via **Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy**. Reusing the same deployment URL keeps `assets/config.js` unchanged.

---

## 3. Hosting

Vanilla static site — drop the folder onto any host. No build step.

### Option A — Netlify / Vercel (drag & drop)

1. Sign in to Netlify or Vercel
2. Drag the entire `Keana & Bien` folder into the dashboard
3. Done. You'll get a `*.netlify.app` / `*.vercel.app` URL.

### Option B — Subdomain on `visionsbyiso.com`

To serve at `keanaandbien.visionsbyiso.com`:

1. Deploy the static site to your host of choice (Netlify, Vercel, GitHub Pages, S3+CloudFront)
2. In your DNS provider, add a `CNAME` record:
   - **Host**: `keanaandbien`
   - **Value**: the host's apex (e.g. `cname.vercel-dns.com` for Vercel, `apex-loadbalancer.netlify.com` for Netlify)
3. In the host's dashboard, add `keanaandbien.visionsbyiso.com` as a custom domain and let it provision a TLS certificate

### Option C — GitHub Pages

```bash
cd "Keana & Bien"
git init && git add . && git commit -m "Keana & Bien e-vite"
gh repo create keana-and-bien --public --source=. --push
gh repo edit --enable-pages --pages-branch main
```

Then set a custom domain in repo Settings → Pages.

---

## 4. Customization cheatsheet

| What you want to change | File |
|---|---|
| Couple names, date, addresses, deadlines | `assets/config.js` |
| Verse, parents, sponsors, color palette | `assets/config.js` |
| Section copy (verse, unplugged ceremony, gifts) | `index.html` |
| Colors, fonts, spacing, animations | `assets/styles.css` (CSS custom properties at top) |
| Envelope addressee (currently "our beloved guest") | `index.html` → `.envelope__addressee` |
| Replace illustrations | drop new files into `assets/images/`, keep filenames |
| RSVP backend behavior | `apps-script/Code.gs` |

---

## 5. File structure

```
Keana & Bien/
├── index.html
├── assets/
│   ├── styles.css
│   ├── motion.js
│   ├── rsvp.js
│   ├── config.js                 ← edit point for couple/event/RSVP URL
│   ├── florals/
│   │   ├── bloom-cluster-1.svg
│   │   ├── bloom-cluster-2.svg
│   │   ├── hero-couple-social.svg
│   │   ├── monogram.svg
│   │   ├── sprig-line-1.svg
│   │   └── sprig-line-2.svg
│   └── images/
│       └── ust-watercolor.webp
├── apps-script/
│   └── Code.gs                   ← paste into Apps Script editor
└── README.md
```

---

## 6. Mobile + accessibility commitments

- Designed at **390px** width first, scaled up for tablet/desktop
- All touch targets ≥ **44×44 px**
- `env(safe-area-inset-*)` for notch/home-bar phones
- Inputs use **16px** font-size to prevent iOS focus-zoom
- Maps lazy-mounted (only fetched when scrolled into view)
- Maps deep-link to **`maps://`** on iOS, **`geo:`** on Android
- Light haptics (`navigator.vibrate`) on RSVP submit + stepper increments
- Offline-tolerant RSVP: failed submissions cache in `localStorage` and retry on reconnect
- Full `prefers-reduced-motion: reduce` support — all motion is disabled when requested
- Initial JS payload < 30 KB; images served as WebP

---

## 7. Things you may want to add later

- A real **photo-gallery QR** in the *Unplugged ceremony* section (replace the placeholder `<div class="notes__qr">`)
- An **Add to calendar** button (Google / Apple / Outlook .ics)
- **Email notifications** to the couple on each new RSVP (Apps Script: add `MailApp.sendEmail(...)` inside `doPost` after the write)
- Per-guest **personalized invite links** (e.g. `?guest=keithA`) — easy to add by reading `URLSearchParams` and pre-selecting that guest

---

With love,
B & K · 06.13.2026
