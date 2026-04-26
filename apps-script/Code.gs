/**
 * Keana & Bien — RSVP backend (Google Apps Script Web App)
 *
 * Sheet "Guests" columns (row 1 must be these headers, exactly):
 *   A: Name
 *   B: Aliases             (comma-separated nicknames; optional)
 *   C: Side                ("Bride" | "Groom")
 *   D: PlusOneAllowed      (TRUE / FALSE)
 *   E: MaxGuests           (integer; total seats incl. named guest)
 *   F: Attending           (filled by RSVP submission)
 *   G: GuestCount          (filled by RSVP submission)
 *   H: Message             (filled by RSVP submission)
 *   I: RespondedAt         (filled by RSVP submission)
 *
 * Deploy:
 *   1. Open script.google.com → New project → paste this file as Code.gs
 *   2. Open the linked Spreadsheet in the script editor: Resources → Properties:
 *      Project Properties → Script properties → add SHEET_ID = <your spreadsheet id>
 *      OR — easier — just keep this script attached to your Sheet via
 *      Extensions → Apps Script (so SpreadsheetApp.getActive() works).
 *   3. Deploy → New deployment → type: Web app
 *      Execute as: Me · Who has access: Anyone
 *   4. Copy the Web App URL into assets/config.js → appsScriptUrl.
 */

const SHEET_NAME = "Guests";

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error("This script must be bound to a Spreadsheet (Extensions → Apps Script).");
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Sheet '" + SHEET_NAME + "' not found. Create it with the header row described in Code.gs.");
  return sh;
}

function getRows_() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const range = sh.getRange(2, 1, last - 1, 9);
  return range.getValues().map((r, i) => ({
    rowIndex: i + 2,
    name: String(r[0] || "").trim(),
    aliases: String(r[1] || "").trim(),
    side: String(r[2] || "").trim() || "Bride",
    plusOneAllowed: r[3] === true || String(r[3]).toUpperCase() === "TRUE",
    maxGuests: Number(r[4]) || 1,
    attending: String(r[5] || "").trim(),
    guestCount: Number(r[6]) || 0,
    message: String(r[7] || "").trim(),
    respondedAt: r[8],
  }));
}

function normalize_(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function score_(query, guest) {
  const q = normalize_(query);
  if (!q) return 0;
  const haystack = normalize_(guest.name + " " + (guest.aliases || ""));
  if (haystack.indexOf(q) === 0) return 100;
  if (haystack.indexOf(" " + q) !== -1) return 80;
  if (haystack.indexOf(q) !== -1) return 60;
  const words = q.split(" ");
  if (words.every(function (w) { return haystack.indexOf(w) !== -1; })) return 40;
  return 0;
}

function publicShape_(g) {
  return {
    id: String(g.rowIndex), // row index serves as a stable id
    name: g.name,
    side: g.side,
    plusOneAllowed: !!g.plusOneAllowed,
    maxGuests: g.maxGuests,
    hasResponded: !!(g.attending),
    attending: g.attending || null,
    guestCount: g.guestCount || 0,
    message: g.message || "",
  };
}

/* =========== GET — private lookup (no guest list exposure) ============ */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "";
    if (action !== "lookup") {
      return jsonOut_({ ok: false, error: "Unknown action" });
    }
    const q = (e.parameter.q || "").trim();
    if (q.length < 3) return jsonOut_(null);
    const rows = getRows_();
    const matches = rows
      .map(function (g) { return Object.assign({}, g, { _s: score_(q, g) }); })
      .filter(function (g) { return g._s >= 80; })
      .sort(function (a, b) { return b._s - a._s; })
      .slice(0, 2);

    // Privacy-safe behavior:
    // - return null when no match
    // - return null when ambiguous (same top score across 2 guests)
    // - return a single guest object only when confidence is high enough and unique
    if (!matches.length) return jsonOut_(null);
    if (matches.length > 1 && matches[0]._s === matches[1]._s) return jsonOut_(null);
    return jsonOut_(publicShape_(matches[0]));
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

/* =========== POST — submit / update RSVP ============ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const id   = String(body.id || "").trim();
    const attending = String(body.attending || "").trim();
    const guestCount = Number(body.guestCount) || 0;
    const message = String(body.message || "").slice(0, 1000);

    if (!id) return jsonOut_({ ok: false, error: "Missing guest id" });
    if (attending !== "Yes" && attending !== "No") {
      return jsonOut_({ ok: false, error: "attending must be Yes or No" });
    }

    const sh = getSheet_();
    const row = parseInt(id, 10);
    if (!row || row < 2 || row > sh.getLastRow()) {
      return jsonOut_({ ok: false, error: "Invalid guest id" });
    }

    const maxGuests = Number(sh.getRange(row, 5).getValue()) || 1;
    const plusOneAllowed = sh.getRange(row, 4).getValue() === true ||
      String(sh.getRange(row, 4).getValue()).toUpperCase() === "TRUE";

    let finalCount;
    if (attending === "No") finalCount = 0;
    else if (!plusOneAllowed) finalCount = 1;
    else finalCount = Math.max(1, Math.min(guestCount, maxGuests));

    sh.getRange(row, 6).setValue(attending);
    sh.getRange(row, 7).setValue(finalCount);
    sh.getRange(row, 8).setValue(message);
    sh.getRange(row, 9).setValue(new Date());

    return jsonOut_({ ok: true, guestCount: finalCount });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
