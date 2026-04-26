/* =========================================================================
   Keana & Bien — motion + interactions
   - Envelope intro (wax seal break → flap → letter → fade)
   - Scroll reveals (IntersectionObserver)
   - Live countdown
   - Palette population from config
   - Floating dock + sticky CTA visibility
   - Lazy-mounted Google Maps
   - Hero paper-tilt (desktop only)
   - prefers-reduced-motion respected throughout
   ========================================================================= */
(function () {
  "use strict";

  const cfg = window.EVITE_CONFIG || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = matchMedia("(pointer: coarse)").matches;

  // ---------- ENVELOPE INTRO ----------
  const envelope    = document.getElementById("envelope");
  const seal        = document.getElementById("envelopeSeal");
  const app         = document.getElementById("app");

  function openEnvelope() {
    if (!envelope || envelope.dataset.state === "open") return;
    envelope.dataset.state = "cracking";
    if (navigator.vibrate && !reduced) navigator.vibrate(8);

    // After the shake, animate flap + letter
    setTimeout(() => {
      envelope.dataset.state = "open";
      app.classList.add("is-active");
      app.setAttribute("aria-hidden", "false");
      // If a hash was present at load time, honor it now
      const hash = (window.location.hash || "").slice(1);
      if (hash) {
        const target = document.getElementById(hash);
        if (target) {
          requestAnimationFrame(() => {
            const top = target.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
          });
        }
      }
    }, reduced ? 0 : 380);

    // After the open animation completes, hide the envelope from the a11y tree
    setTimeout(() => {
      envelope.style.pointerEvents = "none";
      envelope.setAttribute("aria-hidden", "true");
    }, reduced ? 100 : 1700);
  }

  if (seal) {
    seal.addEventListener("click", openEnvelope);
  }

  // QA / preview escape hatch: ?preview skips the envelope entirely
  if (/[?&]preview\b/.test(window.location.search)) {
    // Skip animations entirely — show app + jump to hash instantly
    if (envelope) {
      envelope.dataset.state = "open";
      envelope.style.transition = "none";
      envelope.style.opacity = "0";
      envelope.style.visibility = "hidden";
      envelope.style.pointerEvents = "none";
    }
    if (app) {
      app.classList.add("is-active");
      app.style.transition = "none";
      app.style.opacity = "1";
      app.setAttribute("aria-hidden", "false");
    }
    const hash = (window.location.hash || "").slice(1);
    if (hash) {
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo(0, top);
        }
      });
    }
  }
  // Allow keyboard / Enter / Space to open
  if (envelope) {
    envelope.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEnvelope();
      }
    });
  }
  // Allow swipe-up on the envelope as an alternate gesture
  let touchStartY = null;
  envelope?.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  envelope?.addEventListener("touchmove", (e) => {
    if (touchStartY == null) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (dy > 60) {
      touchStartY = null;
      openEnvelope();
    }
  }, { passive: true });

  // ---------- SCROLL REVEAL ----------
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-revealed"));
  }

  // ---------- COUNTDOWN ----------
  const cdGrid = document.getElementById("countdownGrid");
  const cdTargets = {
    days:    cdGrid?.querySelector('[data-cd="days"]'),
    hours:   cdGrid?.querySelector('[data-cd="hours"]'),
    minutes: cdGrid?.querySelector('[data-cd="minutes"]'),
    seconds: cdGrid?.querySelector('[data-cd="seconds"]'),
  };
  const targetTime = new Date(cfg.weddingDate || "2026-06-13T10:00:00+08:00").getTime();

  function pad(n, w) { return String(n).padStart(w, "0"); }

  function tickCountdown() {
    if (!cdGrid) return;
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      cdGrid.innerHTML = '<p class="countdown__finished script">It\'s today! 🌼</p>';
      return;
    }
    const totalSec = Math.floor(diff / 1000);
    const days     = Math.floor(totalSec / 86400);
    const hours    = Math.floor((totalSec % 86400) / 3600);
    const minutes  = Math.floor((totalSec % 3600) / 60);
    const seconds  = totalSec % 60;

    setNum(cdTargets.days,    pad(days, 3));
    setNum(cdTargets.hours,   pad(hours, 2));
    setNum(cdTargets.minutes, pad(minutes, 2));
    setNum(cdTargets.seconds, pad(seconds, 2));
  }
  function setNum(el, val) {
    if (!el || el.textContent === val) return;
    el.textContent = val;
    if (!reduced) {
      el.classList.add("tick");
      setTimeout(() => el.classList.remove("tick"), 120);
    }
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  // ---------- PALETTE POPULATION ----------
  const paletteRoot = document.getElementById("palette");
  if (paletteRoot && Array.isArray(cfg.palette)) {
    cfg.palette.forEach((c, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "palette__dot";
      dot.style.background = c.hex;
      dot.style.transitionDelay = (i * 50) + "ms";
      dot.setAttribute("data-label", `${c.name} · ${c.hex}`);
      dot.setAttribute("aria-label", `${c.name} ${c.hex}`);
      dot.setAttribute("aria-pressed", "false");
      dot.addEventListener("click", () => {
        const all = paletteRoot.querySelectorAll(".palette__dot");
        all.forEach(d => d.setAttribute("aria-pressed", "false"));
        dot.setAttribute("aria-pressed", "true");
        if (navigator.vibrate && !reduced) navigator.vibrate(5);
      });
      paletteRoot.appendChild(dot);
    });
  }

  // ---------- DOCK + STICKY CTA visibility ----------
  const dock   = document.getElementById("dock");
  const cta    = document.getElementById("ctaRsvp");
  const hero   = document.getElementById("hero");
  const dockLinks = dock ? dock.querySelectorAll("a") : [];

  function updateChrome() {
    if (!hero) return;
    const heroBottom = hero.getBoundingClientRect().bottom;
    const past = heroBottom < window.innerHeight * 0.5;
    dock?.classList.toggle("is-visible", past);
    cta?.classList.toggle("is-visible", past);
  }

  // Highlight current section in the dock
  const sections = ["invitation", "venues", "entourage", "attire", "rsvp"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          dockLinks.forEach((a) => {
            a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id);
          });
        }
      });
    }, { threshold: 0.46 });
    sections.forEach((s) => sectionIO.observe(s));
  }

  let scrollRaf = null;
  window.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      updateChrome();
      scrollRaf = null;
    });
  }, { passive: true });
  updateChrome();

  // ---------- LAZY-MOUNT GOOGLE MAPS ----------
  const mapHolders = document.querySelectorAll("[data-map-query]");
  if ("IntersectionObserver" in window && mapHolders.length) {
    const mapIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const holder = entry.target;
          const q = encodeURIComponent(holder.dataset.mapQuery);
          const iframe = document.createElement("iframe");
          iframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
          iframe.loading = "lazy";
          iframe.referrerPolicy = "no-referrer-when-downgrade";
          iframe.title = `Map of ${holder.dataset.mapQuery}`;
          iframe.allowFullscreen = true;
          holder.innerHTML = "";
          holder.appendChild(iframe);
          mapIO.unobserve(holder);
        }
      });
    }, { rootMargin: "200px 0px" });
    mapHolders.forEach((m) => mapIO.observe(m));
  }

  // "Get directions" — opens native Maps on iOS/Android, Google Maps on desktop
  document.querySelectorAll("[data-directions]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const q = encodeURIComponent(a.dataset.directions);
      const ua = navigator.userAgent || "";
      let url;
      if (/iPhone|iPad|iPod/i.test(ua))      url = `maps://?q=${q}`;
      else if (/Android/i.test(ua))          url = `geo:0,0?q=${q}`;
      else                                   url = `https://www.google.com/maps/search/?api=1&query=${q}`;
      window.open(url, "_blank", "noopener");
    });
  });

  // ---------- HERO PAPER-TILT (desktop only, dampened) ----------
  const heroCouple = document.getElementById("heroCouple");
  if (heroCouple && !isCoarsePointer && !reduced) {
    let raf = null, lastX = 0, lastY = 0;
    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      lastX = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 → 0.5
      lastY = (e.clientY - rect.top)  / rect.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        heroCouple.style.transform = `perspective(1200px) rotateY(${lastX * 6}deg) rotateX(${-lastY * 4}deg)`;
        raf = null;
      });
    });
    hero.addEventListener("mouseleave", () => {
      heroCouple.style.transform = "";
    });
  }

  // ---------- SHARE BUTTON ----------
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.href;
      const title = "Bien & Keana · 06.13.2026";
      const text = "Bien & Keana invite you to their wedding. Saturday, June 13, 2026.";
      try {
        if (navigator.share) {
          await navigator.share({ title, text, url });
        } else {
          await navigator.clipboard.writeText(url);
          shareBtn.textContent = "Link copied ✓";
          setTimeout(() => { shareBtn.textContent = "Share this invitation"; }, 1800);
        }
      } catch (_) { /* user cancelled */ }
    });
  }


  // Smooth-scroll for in-page anchor clicks (with offset for the dock)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  });

  // Auto-focus the search input when arriving at #rsvp
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#rsvp") {
      setTimeout(() => document.getElementById("rsvpGuestName")?.focus({ preventScroll: true }), 600);
    }
  });
})();
