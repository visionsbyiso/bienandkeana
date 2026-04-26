/* =========================================================================
   Keana & Bien — RSVP client (open form, no guest search)
   ========================================================================= */
(function () {
  "use strict";

  const cfg = window.EVITE_CONFIG || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HAS_BACKEND = !!cfg.appsScriptUrl;
  const PENDING_KEY = "kb_evite_pending_rsvp";

  const $card = document.getElementById("rsvpCard");
  const $name = document.getElementById("rsvpGuestName");
  const $plusOneRow = document.getElementById("plusOneNameRow");
  const $plusOneName = document.getElementById("plusOneName");
  const $msg = document.getElementById("rsvpMessage");
  const $submit = document.getElementById("rsvpSubmit");
  const $error = document.getElementById("rsvpError");
  const $success = document.getElementById("rsvpSuccess");
  const $sucTitle = document.getElementById("rsvpSuccessTitle");
  const $sucBody = document.getElementById("rsvpSuccessBody");
  const $edit = document.getElementById("rsvpEdit");

  if (!$card || !$name) return;

  async function submitRSVP(payload) {
    if (HAS_BACKEND) {
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
    return { ok: true };
  }

  function showError(msg) {
    $error.textContent = msg;
    $error.hidden = false;
  }

  function showSuccess(attending) {
    $card.style.display = "none";
    $success.classList.add("is-open");
    if (attending === "No") {
      $sucTitle.textContent = "We'll miss you";
      $sucBody.textContent = "Thank you for letting us know. You'll be in our hearts on the day.";
    } else {
      $sucTitle.textContent = "With our hearts";
      $sucBody.textContent = "Your reply has been received. We can't wait to celebrate with you.";
    }
    $success.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

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
    const pending = readPending();
    if (!pending) return;
    try {
      await submitRSVP(pending);
      clearPending();
    } catch (_) {
      // keep pending
    }
  }
  window.addEventListener("online", retryPending);
  if (navigator.onLine) retryPending();

  $card.addEventListener("change", () => {
    const hasPlusOne = $card.querySelector('input[name="hasPlusOne"]:checked')?.value;
    $plusOneRow.style.display = hasPlusOne === "Yes" ? "" : "none";
    if (hasPlusOne !== "Yes") $plusOneName.value = "";
  });

  $card.addEventListener("submit", async (e) => {
    e.preventDefault();
    $error.hidden = true;

    const attending = $card.querySelector('input[name="attending"]:checked')?.value;
    const hasPlusOne = $card.querySelector('input[name="hasPlusOne"]:checked')?.value || "No";
    const guestName = ($name.value || "").trim();
    const plusOneName = ($plusOneName.value || "").trim();

    if (!guestName) return showError("Please enter your full name.");
    if (!attending) return showError("Please let us know if you'll be joining us.");
    if (hasPlusOne === "Yes" && !plusOneName) return showError("Please provide your plus one's full name.");

    const payload = {
      name: guestName,
      attending,
      hasPlusOne,
      plusOneName: hasPlusOne === "Yes" ? plusOneName : "",
      message: ($msg.value || "").trim().slice(0, 1000),
    };

    $submit.disabled = true;
    $submit.classList.remove("is-pulse");
    $submit.classList.add("is-pulse");
    $submit.textContent = "Sending…";
    if (navigator.vibrate && !reduced) navigator.vibrate(10);

    try {
      await submitRSVP(payload);
      clearPending();
      showSuccess(attending);
    } catch (err) {
      console.error(err);
      cachePending(payload);
      if (!navigator.onLine) {
        showError("You're offline. We've saved your reply and will send it once you're back online.");
      } else {
        showError("Something went wrong sending your reply. We've saved it and will retry.");
      }
    } finally {
      $submit.disabled = false;
      $submit.textContent = "Send my reply";
    }
  });

  $edit?.addEventListener("click", () => {
    $success.classList.remove("is-open");
    $card.style.display = "";
    $card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  });
})();
