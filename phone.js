// Two small jobs for visitors who arrive from an ad.
// 1. Keep the campaign tags (utm_*) from the address, and hand them on to /buy/
//    (which passes them to Stripe) and to any link a phone visitor sends to their Mac.
//    Read here, before demo.js rewrites the address as you scroll.
// 2. On a phone or tablet the DMG is no use, so "Download" opens a sheet that sends
//    the page to your Mac instead: the share sheet (AirDrop, Messages, Notes, Reminders),
//    an email to yourself from your own mail app, or a copied link.
//    Nothing is collected: no form, no server.
(() => {
  const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const landing = new URLSearchParams(location.search);
  const tags = new URLSearchParams();
  for (const k of UTM) if (landing.get(k)) tags.set(k, landing.get(k).slice(0, 200));
  const withTags = (href) => {
    if (![...tags].length) return href;
    const u = new URL(href, location.href);
    for (const [k, v] of tags) u.searchParams.set(k, v);
    return u.href;
  };

  document.querySelectorAll('a[href="/buy/"], a[href="/buy"]').forEach((a) => (a.href = withTags(a.href)));

  const ua = navigator.userAgent;
  const handheld = /iPhone|iPod|iPad|Android|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!handheld) return;

  const pageLink = withTags("https://sorot.app/");
  const downloads = [...document.querySelectorAll('a[href$="Sorot.dmg"]')];
  downloads.forEach((a) => {
    a.dataset.mac = a.href;
    a.href = "#send";
    if (a.classList.contains("btn")) a.textContent = "Send to my Mac";
    else a.textContent = "Send to Mac";
    a.addEventListener("click", (e) => { e.preventDefault(); open(); });
  });

  const subject = "Sorot, for my Mac";
  const body = `Open this on your Mac to download Sorot, the teleprompter in the notch:\n\n${pageLink}\n\nmacOS 26 · Apple silicon`;
  const canShare = typeof navigator.share === "function";

  const sheet = document.createElement("div");
  sheet.className = "send";
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="send-scrim" data-close></div>
    <div class="send-card" role="dialog" aria-modal="true" aria-labelledby="sendTitle">
      <button class="send-x" type="button" aria-label="Close" data-close>×</button>
      <p class="send-eyebrow">Sorot runs on your Mac</p>
      <h3 id="sendTitle">Send it to your Mac</h3>
      <p class="send-lede">Open the link there and download. Takes a minute.</p>
      <div class="send-actions">
        ${canShare ? `<button type="button" class="btn" data-act="share">Share… <span>AirDrop, Messages, Notes</span></button>` : ""}
        <a class="btn ${canShare ? "ghost-btn" : ""}" data-act="mail" href="mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Email it to myself</a>
        <button type="button" class="btn ghost-btn" data-act="copy">Copy link</button>
      </div>
      <p class="send-fine">macOS 26 · Apple silicon. Free to try; Pro is $8.99, once.</p>
    </div>`;
  document.body.appendChild(sheet);

  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("on"));
    sheet.querySelector(".send-actions > *").focus({ preventScroll: true });
  }
  function close() {
    sheet.classList.remove("on");
    setTimeout(() => { sheet.hidden = true; lastFocus?.focus?.({ preventScroll: true }); }, 280);
  }
  sheet.addEventListener("click", async (e) => {
    if (e.target.closest("[data-close]")) return close();
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "share") {
      try { await navigator.share({ title: "Sorot", text: "Sorot, the teleprompter in your Mac's notch. Open on your Mac:", url: pageLink }); close(); } catch {}
    } else if (act === "copy") {
      const button = e.target.closest("button");
      try { await navigator.clipboard.writeText(pageLink); button.textContent = "Copied. Paste it on your Mac"; }
      catch { button.textContent = pageLink; }
    }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) close(); });
})();
