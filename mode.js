// mode.js — unified color-mode + click-sound logic for km.rowe
// Modes supported: alt-mode (blue), crt-mode (green), epaper-mode (paper/grayscale)

(function () {
  const STORAGE_KEY = "mode";
  const MODES = ["alt-mode", "crt-mode", "epaper-mode"]; // order of cycling

  function playClickSound() {
    const el = document.getElementById("click-sound");
    if (!el) return;
    try {
      el.currentTime = 0;
      el.play();
    } catch (_) {}
  }

  function setButtonLabel(mode) {
    const btn = document.getElementById("modeToggle");
    if (!btn) return;
    const labelMap = {
      "alt-mode": "green mode",
      "crt-mode": "blue mode",
      "epaper-mode": "epaper mode",
    };
    btn.textContent = labelMap[mode] || "mode";
    btn.setAttribute("aria-label", `switch to ${labelMap[mode] || "next"} `);
  }

  function apply(mode) {
    const body = document.body;
    MODES.forEach((m) => body.classList.remove(m));
    // Safety: ensure exactly one valid mode is applied
    const target = MODES.includes(mode) ? mode : MODES[0];
    body.classList.add(target);
    setButtonLabel(target);
    localStorage.setItem(STORAGE_KEY, target);
  }

  function currentMode() {
    const body = document.body;
    return MODES.find((m) => body.classList.contains(m)) || MODES[0];
  }

  // Public: toggle to next mode
  window.toggleMode = function toggleMode() {
    const cur = currentMode();
    const next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
    apply(next);
    playClickSound();
  };

  // Init on DOM ready
  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    apply(saved || MODES[0]);

    // Wire the toggle button if present (works with or without inline onclick attr)
    const btn = document.getElementById("modeToggle");
    if (btn && !btn.__wired) {
      btn.addEventListener("click", toggleMode);
      btn.__wired = true;
    }

    // Global click feedback (optional; keeps previous behavior)
    document.addEventListener("click", (e) => {
      // Don’t steal focus sounds from form fields or text selection
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select", "button"].includes(tag)) return;
      playClickSound();
    });
  });
})();