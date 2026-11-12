// Sorot's website analytics. Cookieless: no visitor id, no fingerprinting, no IP stored.
//
// Two parts:
//  1. Cloudflare Web Analytics (static.cloudflareinsights.com): visits, pages, referrers,
//     countries, page speed. Cookieless, run by Cloudflare.
//  2. Our own event counter on api.sorot.app/e: each page view with the campaign tags
//     (utm_*) that ads add to the address, which slide people reach, and clicks on
//     Download, Get Pro and "Send to my Mac". /buy packs the campaign into the Stripe
//     checkout, so the license server can count a purchase against the ad that brought it.
//
// The campaign tags are kept in sessionStorage (this tab only, gone when it closes) so a
// later click still knows which ad the visit came from. If the browser sends Global
// Privacy Control, nothing is counted.
//
// Anywhere on the site: window.sorotTrack("event_name", { where | slide | method | theme }).
(() => {
  const CF_TOKEN = "ec3fcd887b654aed8aeadb0d8c537156"; // public Web Analytics token for sorot.app
  const API = "https://api.sorot.app/e";
  const off = navigator.globalPrivacyControl === true || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  // Campaign: from this address if it has utm_* tags, otherwise what this tab saw first.
  const KEY = "sorot-campaign";
  const here = new URLSearchParams(location.search);
  let campaign = null;
  if (here.get("utm_source") || here.get("utm_campaign")) {
    campaign = { s: here.get("utm_source"), m: here.get("utm_medium"), c: here.get("utm_campaign"), ct: here.get("utm_content") };
    try { sessionStorage.setItem(KEY, JSON.stringify(campaign)); } catch {}
  } else {
    try { campaign = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch {}
  }
  window.sorotCampaign = () => campaign;

  const refHost = (() => {
    try {
      const h = new URL(document.referrer).hostname;
      return h && h !== location.hostname ? h.replace(/^www\./, "") : null;
    } catch { return null; }
  })();

  const send = (e, d) => {
    if (off) return;
    const body = JSON.stringify({ e, p: location.pathname, r: refHost, c: campaign || {}, d: d || null });
    try {
      if (!navigator.sendBeacon(API, new Blob([body], { type: "text/plain" }))) throw 0;
    } catch {
      fetch(API, { method: "POST", body, keepalive: true, mode: "cors", headers: { "content-type": "text/plain" } }).catch(() => {});
    }
  };
  window.sorotTrack = (name, props) => {
    const p = props || {};
    send(name, String(p.where || p.slide || p.method || p.theme || "") || null);
  };

  if (off) return;

  // Cloudflare Web Analytics beacon.
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: CF_TOKEN });
  document.head.appendChild(s);

  send("pageview");

  // Clicks worth counting, by what they point at. `where` says which button.
  const where = (a) => a.closest("header") ? "nav" : (a.closest("section")?.id || a.closest("main")?.className || "page");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a, button");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.endsWith("Sorot.dmg")) window.sorotTrack("download_click", { where: where(a) });
    else if (href.startsWith("/buy")) window.sorotTrack("buy_click", { where: where(a) });
    else if (href.startsWith("/activate")) window.sorotTrack("activate_help", { where: where(a) });
    else if (a.dataset.theme) window.sorotTrack("theme_change", { theme: a.dataset.theme });
  }, { capture: true });
})();
