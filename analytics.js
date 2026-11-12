// Sorot's website analytics, through Gelitik (https://gelitik.allrize.tech), our own
// first-party tool. No ad pixels, no third parties, no IP addresses stored.
//
// What it records: page views (with the campaign tags, utm_*, that ads add to the
// address), which slide people reach, and clicks on Download, Get Pro and "Send to
// my Mac". The visitor id from Gelitik's cookie also travels to Stripe as the
// checkout's client_reference_id, so a purchase can be credited to the campaign
// that brought the visitor (the license server reports the purchase).
//
// Anywhere on the site: window.sorotTrack("event_name", { key: "value" }).
(() => {
  // The Sorot project's public site key in Gelitik. Public by design (it's in page HTML).
  const SITE = "gk_PENDING";
  window.SOROT_GELITIK_SITE = SITE;
  const API = "https://gelitik.allrize.tech/e";
  const SCRIPT = "https://gelitik.allrize.tech/gelitik.js";

  const queue = [];
  window.sorotTrack = (name, props) => {
    if (window.gelitik) window.gelitik.track(name, props);
    else queue.push([name, props]);
  };

  if (!/^gk_[A-Za-z0-9]{16,40}$/.test(SITE)) return; // not set up yet: track nothing
  if (navigator.globalPrivacyControl === true) return; // the visitor asked not to be tracked

  const s = document.createElement("script");
  s.src = SCRIPT;
  s.defer = true;
  s.dataset.site = SITE;
  s.dataset.api = API;
  s.onload = () => { while (queue.length) window.gelitik && window.gelitik.track(...queue.shift()); };
  document.head.appendChild(s);

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
