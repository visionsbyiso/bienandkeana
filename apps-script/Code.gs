/**
 * Keana & Bien — RSVP backend (Google Apps Script Web App)
 *
 * Sheet name: RSVPs
 * Header row (A1:F1):
 * Name | Attending | HasPlusOne | PlusOneName | Message | SubmittedAt
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
    const body = parseBody_(e);
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

function parseBody_(e) {
  const raw = String(e && e.postData && e.postData.contents || "").trim();
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      // Fall back to form params below.
    }
  }
  const p = (e && e.parameter) || {};
  return {
    name: p.name || "",
    attending: p.attending || "",
    hasPlusOne: p.hasPlusOne || "No",
    plusOneName: p.plusOneName || "",
    message: p.message || "",
  };
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
