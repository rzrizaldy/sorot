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
  // Visitors in Indonesia (by time zone, see price.js) get the sheet in Indonesian and a
  // WhatsApp button: "Message yourself" there is how most people move a link to their laptop.
  const id = window.sorotPriceRegion === "id";
  const T = id ? {
    btn: "Kirim ke Mac", link: "Kirim ke Mac", eyebrow: "Sorot jalan di Mac", title: "Kirim ke Mac kamu",
    lede: "Buka link-nya di Mac, lalu download. Cuma semenit.", share: "Bagikan…", shareSub: "AirDrop, Pesan, Catatan",
    mail: "Email ke diri sendiri", copy: "Salin link", copied: "Tersalin. Tempel di Mac kamu",
    subject: "Sorot, buat Mac-ku", body: "Buka ini di Mac untuk download Sorot, teleprompter di notch:",
    shareText: "Sorot, teleprompter di notch Mac. Buka di Mac:",
    fine: `macOS 26 · Apple silicon. Gratis dicoba; Pro ${window.sorotPrice}, sekali bayar.`,
  } : {
    btn: "Send to my Mac", link: "Send to Mac", eyebrow: "Sorot runs on your Mac", title: "Send it to your Mac",
    lede: "Open the link there and download. Takes a minute.", share: "Share…", shareSub: "AirDrop, Messages, Notes",
    mail: "Email it to myself", copy: "Copy link", copied: "Copied. Paste it on your Mac",
    subject: "Sorot, for my Mac", body: "Open this on your Mac to download Sorot, the teleprompter in the notch:",
    shareText: "Sorot, the teleprompter in your Mac's notch. Open on your Mac:",
    fine: `macOS 26 · Apple silicon. Free to try; Pro is ${window.sorotPrice || "$8.99"}, once.`,
  };
  const downloads = [...document.querySelectorAll('a[href$="Sorot.dmg"]')];
  downloads.forEach((a) => {
    a.dataset.mac = a.href;
    a.href = "#send";
    a.textContent = a.classList.contains("btn") ? T.btn : T.link;
    a.addEventListener("click", (e) => { e.preventDefault(); open(); });
  });

  const subject = T.subject;
  const body = `${T.body}\n\n${pageLink}\n\nmacOS 26 · Apple silicon`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${T.body} ${pageLink}`)}`;
  const canShare = typeof navigator.share === "function";

  const sheet = document.createElement("div");
  sheet.className = "send";
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="send-scrim" data-close></div>
    <div class="send-card" role="dialog" aria-modal="true" aria-labelledby="sendTitle">
      <button class="send-x" type="button" aria-label="Close" data-close>×</button>
      <p class="send-eyebrow">${T.eyebrow}</p>
      <h3 id="sendTitle">${T.title}</h3>
      <p class="send-lede">${T.lede}</p>
      <div class="send-actions">
        ${id ? `<a class="btn" data-act="whatsapp" href="${wa}" target="_blank" rel="noopener">WhatsApp <span>kirim ke diri sendiri</span></a>` : ""}
        ${canShare ? `<button type="button" class="btn ${id ? "ghost-btn" : ""}" data-act="share">${T.share} <span>${T.shareSub}</span></button>` : ""}
        <a class="btn ${canShare || id ? "ghost-btn" : ""}" data-act="mail" href="mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">${T.mail}</a>
        <button type="button" class="btn ghost-btn" data-act="copy">${T.copy}</button>
      </div>
      <p class="send-fine">${T.fine}</p>
    </div>`;
  document.body.appendChild(sheet);

  let lastFocus = null;
  function open() {
    window.sorotTrack?.("send_to_mac_open");
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
    if (act) window.sorotTrack?.("send_to_mac", { method: act });
    if (act === "share") {
      try { await navigator.share({ title: "Sorot", text: T.shareText, url: pageLink }); close(); } catch {}
    } else if (act === "copy") {
      const button = e.target.closest("button");
      try { await navigator.clipboard.writeText(pageLink); button.textContent = T.copied; }
      catch { button.textContent = pageLink; }
    }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) close(); });
})();
