# Keana & Bien — Wedding E-vite

A premium, mobile-first wildflower e-vite for **Bien & Keana** · *Saturday, June 13, 2026*.

- Champagne-cream paper · Petit Formal Script + Libre Caslon Text
- Cinematic vellum-envelope intro
- Guest-list-aware RSVP backed by Google Sheets
- Privacy-safe RSVP lookup (no guest-name dropdown/exposure)
- Vanilla HTML/CSS/JS · no build step

---

## 1. Quick preview (local)

```bash
cd "Keana & Bien"
python3 -m http.server 8000
# open http://localhost:8000
```

A built-in **demo guest list** lives in `assets/config.js` so you can try the full RSVP flow with no backend wired up yet:

| Try typing | Result |
|---|---|
| `Coleen` | +1 allowed, max 2 |
| `Keith` | +1 allowed, max 2 |
| `Maria` | solo, no +1 |
| `Juan` | already responded (Update mode) |
| `Rivera` | family of 4 |

When `EVITE_CONFIG.appsScriptUrl` is set (Step 2 below), the demo list is bypassed and the real Google Sheet is used.

---

## 2. RSVP setup (Google Sheet + Apps Script)

### 2a. Create the Sheet

1. Create a new Google Sheet (any name — e.g. *Keana & Bien RSVPs*).
2. Rename Sheet 1 to **`Guests`** (case-sensitive).
3. Paste this header row exactly into row 1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| `Name` | `Aliases` | `Side` | `PlusOneAllowed` | `MaxGuests` | `Attending` | `GuestCount` | `Message` | `RespondedAt` |

4. Add your guests starting on row 2. Example:

| Name | Aliases | Side | PlusOneAllowed | MaxGuests | Attending | GuestCount | Message | RespondedAt |
|---|---|---|---|---|---|---|---|---|
| Coleen Reyes | Coleen | Bride | TRUE | 2 |  |  |  |  |
| Keith Anthony Cruz | Keith | Groom | TRUE | 2 |  |  |  |  |
| Maria Santos | Maris | Bride | FALSE | 1 |  |  |  |  |
| The Rivera Family | Rivera | Bride | TRUE | 4 |  |  |  |  |

**Column reference**

- `Name` — canonical full name; used for private lookup
- `Aliases` — comma-separated nicknames (so "Keith" finds "Keith Anthony Cruz")
- `Side` — `Bride` or `Groom`
- `PlusOneAllowed` — `TRUE` shows the +1 stepper to the guest; `FALSE` hides it
- `MaxGuests` — total seats including the named guest (`1` = solo, `2` = +1, `4` = family)
- `Attending` / `GuestCount` / `Message` / `RespondedAt` — leave empty; filled by the form

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

Reload the site. Search now hits your Sheet; submissions write back to it.

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
│   └── images/
│       ├── hero-couple.webp
│       ├── monogram-wreath.webp
│       ├── wildflower-frame.webp
│       ├── wildflower-sprig.webp
│       ├── wildflower-sprig-2.webp
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
