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

const SHEET_NAME = "RSVPs";

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss) throw new Error("This script must be bound to a Spreadsheet (Extensions → Apps Script).");
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Sheet '" + SHEET_NAME + "' not found. Create it with the header row described in Code.gs.");
  return sh;
}

function ensureHeader_() {
  const sh = getSheet_();
  if (sh.getLastRow() === 0) {
    sh.appendRow(["Name", "Attending", "HasPlusOne", "PlusOneName", "Message", "SubmittedAt"]);
  } else {
    const first = sh.getRange(1, 1, 1, 6).getValues()[0];
    if (String(first[0] || "").trim() !== "Name") {
      sh.insertRows(1);
      sh.getRange(1, 1, 1, 6).setValues([["Name", "Attending", "HasPlusOne", "PlusOneName", "Message", "SubmittedAt"]]);
    }
  }
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

/* =========== GET — service status ============ */
function doGet(e) {
  try {
    return jsonOut_({ ok: true, service: "rsvp-open-form" });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

/* =========== POST — submit RSVP ============ */
function doPost(e) {
  try {
    ensureHeader_();
    const body = JSON.parse(e.postData.contents);
    const name = String(body.name || "").trim();
    const attending = String(body.attending || "").trim();
    const hasPlusOne = String(body.hasPlusOne || "No").trim() === "Yes" ? "Yes" : "No";
    const plusOneName = String(body.plusOneName || "").trim();
    const message = String(body.message || "").slice(0, 1000);

    if (!name) return jsonOut_({ ok: false, error: "Missing name" });
    if (attending !== "Yes" && attending !== "No") {
      return jsonOut_({ ok: false, error: "attending must be Yes or No" });
    }
    if (hasPlusOne === "Yes" && !plusOneName) return jsonOut_({ ok: false, error: "Missing plus one name" });

    const sh = getSheet_();
    sh.appendRow([name, attending, hasPlusOne, hasPlusOne === "Yes" ? plusOneName : "", message, new Date()]);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message || err) });
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
