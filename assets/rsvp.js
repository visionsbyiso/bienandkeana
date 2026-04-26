/* =========================================================================
   Keana & Bien — RSVP client
   Flow: search → pick guest → personalized card → submit → success/update
   - Backend: Google Apps Script Web App (set EVITE_CONFIG.appsScriptUrl in config.js)
   - Falls back to a built-in DEMO list when appsScriptUrl is null (for local previews)
   - Offline-tolerant: failed POSTs are cached in localStorage and retried on reconnect
   - Haptics on submit + stepper increments
   ========================================================================= */
(function () {
  "use strict";

  const cfg = window.EVITE_CONFIG || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HAS_BACKEND = !!cfg.appsScriptUrl;
  const PENDING_KEY = "kb_evite_pending_rsvp";

  // ------ DOM refs ------
  const $form     = document.getElementById("rsvpSearchForm");
  const $input    = document.getElementById("rsvpSearchInput");
  const $lookup   = document.getElementById("rsvpLookupBtn");
  const $helper   = document.getElementById("rsvpSearchHelper");
  const $card     = document.getElementById("rsvpCard");
  const $cardName = document.getElementById("rsvpCardName");
  const $cardSide = document.getElementById("rsvpCardSide");
  const $stepRow  = document.getElementById("stepperRow");
  const $stepVal  = document.getElementById("stepperValue");
  const $stepHint = document.getElementById("stepperHint");
  const $stepMin  = document.getElementById("stepperMinus");
  const $stepPlus = document.getElementById("stepperPlus");
  const $msg      = document.getElementById("rsvpMessage");
  const $submit   = document.getElementById("rsvpSubmit");
  const $error    = document.getElementById("rsvpError");
  const $back     = document.getElementById("rsvpBack");
  const $success  = document.getElementById("rsvpSuccess");
  const $sucTitle = document.getElementById("rsvpSuccessTitle");
  const $sucBody  = document.getElementById("rsvpSuccessBody");
  const $edit     = document.getElementById("rsvpEdit");

  if (!$form || !$input) return; // page mismatch — bail safely

  let activeGuest = null;
  let stepperValue = 1;

  // ------ Helpers ------
  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function score(query, guest) {
    const q = normalize(query);
    if (!q) return 0;
    const haystack = normalize(guest.name + " " + (guest.aliases || ""));
    if (haystack.startsWith(q)) return 100;
    if (haystack.includes(" " + q)) return 80;
    if (haystack.includes(q)) return 60;
    // Per-word fuzzy: every query word must appear somewhere
    const words = q.split(" ");
    if (words.every(w => haystack.includes(w))) return 40;
    return 0;
  }

  // ------ Lookup backend abstraction ------
  async function lookupGuest(query) {
    if (HAS_BACKEND) {
      const url = `${cfg.appsScriptUrl}?action=lookup&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
      const data = await res.json();
      return data && data.ok === false ? null : (data || null);
    }
    // DEMO fallback — strict best-match lookup
    const matches = (cfg.demoGuests || [])
      .map(g => ({ ...g, _s: score(query, g) }))
      .filter(g => g._s >= 80)
      .sort((a, b) => b._s - a._s)
      .slice(0, 2);
    if (!matches.length) return null;
    if (matches.length > 1 && matches[0]._s === matches[1]._s) return null;
    return matches[0];
  }

  async function submitRSVP(payload) {
    if (HAS_BACKEND) {
      // Apps Script POST: use text/plain to avoid CORS preflight (Apps Script-friendly pattern)
      const res = await fetch(cfg.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Submit failed (${res.status})`);
      const data = await res.json();
      if (data && data.ok === false) throw new Error(data.error || "Submit failed");
      return data;
    }
    // DEMO: just write to the local list so reload reflects the response
    const target = (cfg.demoGuests || []).find(g => g.id === payload.id);
    if (target) {
      target.hasResponded = true;
      target.attending = payload.attending;
      target.guestCount = payload.guestCount;
      target.message = payload.message;
    }
    return { ok: true };
  }

  function selectGuest(g) {
    activeGuest = g;
    $input.value = g.name;

    $cardName.textContent = g.name;
    $cardSide.textContent = (g.side || "Bride") + "'s side";

    // Reset form
    $card.querySelectorAll('input[name="attending"]').forEach((r) => { r.checked = false; });
    $msg.value = g.message || "";
    $error.hidden = true;

    // +1 stepper visibility
    const allowsPlus = !!g.plusOneAllowed && (Number(g.maxGuests) || 1) > 1;
    if (allowsPlus) {
      $stepRow.style.display = "";
      stepperValue = Math.max(1, Math.min(Number(g.guestCount) || 1, Number(g.maxGuests) || 1));
      updateStepper();
      $stepHint.textContent = `Up to ${g.maxGuests} including yourself`;
    } else {
      $stepRow.style.display = "none";
      stepperValue = 1;
    }

    // Pre-fill if already responded
    if (g.hasResponded && g.attending) {
      const r = $card.querySelector(`input[name="attending"][value="${g.attending}"]`);
      if (r) r.checked = true;
    }

    // Reveal with the page-turn animation
    $success.classList.remove("is-open");
    $card.classList.add("is-open");
    requestAnimationFrame(() => { $card.classList.add("is-shown"); });
    $card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  function updateStepper() {
    if (!activeGuest) return;
    const max = Number(activeGuest.maxGuests) || 1;
    stepperValue = Math.max(1, Math.min(stepperValue, max));
    $stepVal.textContent = stepperValue;
    $stepMin.disabled = stepperValue <= 1;
    $stepPlus.disabled = stepperValue >= max;
  }

  function showError(msg) {
    $error.textContent = msg;
    $error.hidden = false;
    if ($helper) $helper.textContent = msg;
  }

  function showSuccess(msg, attending) {
    $card.classList.remove("is-open", "is-shown");
    $success.classList.add("is-open");
    if (attending === "No") {
      $sucTitle.textContent = "We'll miss you";
      $sucBody.textContent = "Thank you for letting us know. You'll be in our hearts on the day.";
    } else {
      $sucTitle.textContent = "With our hearts";
      $sucBody.textContent = msg || "Your reply has been received. We can't wait to celebrate with you.";
    }
    $success.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  // ------ Pending submission cache (offline retry) ------
  function cachePending(payload) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(payload)); } catch (_) {}
  }
  function clearPending() {
    try { localStorage.removeItem(PENDING_KEY); } catch (_) {}
  }
  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch (_) { return null; }
  }

  async function retryPending() {
    const p = readPending();
    if (!p) return;
    try {
      await submitRSVP(p);
      clearPending();
      console.info("[rsvp] retried pending submission successfully");
    } catch (e) {
      console.warn("[rsvp] retry failed; will try again next time", e);
    }
  }
  window.addEventListener("online", retryPending);
  if (navigator.onLine) retryPending();

  // ------ Listeners ------
  $form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $input.value.trim();
    if (q.length < 3) {
      if ($helper) $helper.textContent = "Please type at least 3 characters from your full name.";
      return;
    }

    if ($lookup) $lookup.disabled = true;
    if ($helper) $helper.textContent = "Looking up your invitation...";
    $error.hidden = true;

    try {
      const guest = await lookupGuest(q);
      if (!guest) {
        if ($helper) $helper.textContent = "No exact invite match found. Please use your full invited name, or message the couple.";
        return;
      }
      if ($helper) $helper.textContent = "Invitation found. You may now submit your RSVP.";
      selectGuest(guest);
    } catch (err) {
      console.error(err);
      if ($helper) $helper.textContent = "Lookup is unavailable right now. Please try again.";
    } finally {
      if ($lookup) $lookup.disabled = false;
    }
  });

  $stepMin.addEventListener("click", () => {
    stepperValue = Math.max(1, stepperValue - 1);
    updateStepper();
    if (navigator.vibrate && !reduced) navigator.vibrate(5);
  });
  $stepPlus.addEventListener("click", () => {
    const max = Number(activeGuest?.maxGuests) || 1;
    stepperValue = Math.min(max, stepperValue + 1);
    updateStepper();
    if (navigator.vibrate && !reduced) navigator.vibrate(5);
  });

  $back.addEventListener("click", () => {
    activeGuest = null;
    $card.classList.remove("is-open", "is-shown");
    $input.value = "";
    if ($helper) $helper.textContent = "For privacy, guest names are hidden. Only exact matches reveal the invitation.";
    $input.focus();
  });

  $edit.addEventListener("click", () => {
    if (!activeGuest) return;
    $success.classList.remove("is-open");
    $card.classList.add("is-open");
    requestAnimationFrame(() => $card.classList.add("is-shown"));
    $card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  });

  $submit.addEventListener("click", async () => {
    if (!activeGuest) return;
    const attending = $card.querySelector('input[name="attending"]:checked')?.value;
    if (!attending) {
      showError("Please let us know if you'll be joining us.");
      return;
    }
    const payload = {
      id: activeGuest.id,
      name: activeGuest.name,
      attending,
      guestCount: attending === "Yes"
        ? (activeGuest.plusOneAllowed ? stepperValue : 1)
        : 0,
      message: ($msg.value || "").trim().slice(0, 1000),
    };

    $error.hidden = true;
    $submit.disabled = true;
    $submit.classList.remove("is-pulse");
    $submit.classList.add("is-pulse");
    $submit.textContent = "Sending…";
    if (navigator.vibrate && !reduced) navigator.vibrate(10);

    try {
      await submitRSVP(payload);
      activeGuest.hasResponded = true;
      activeGuest.attending = payload.attending;
      activeGuest.guestCount = payload.guestCount;
      activeGuest.message = payload.message;
      clearPending();
      showSuccess(null, attending);
    } catch (err) {
      console.error(err);
      // Cache for retry on reconnect
      cachePending(payload);
      if (!navigator.onLine) {
        showError("You're offline. We've saved your reply and will send it once you're back online.");
      } else {
        showError("Something went wrong sending your reply. We've saved it and will retry. You can also email us if it persists.");
      }
    } finally {
      $submit.disabled = false;
      $submit.textContent = "Send my reply";
    }
  });
})();
