// Sorot Pro's price, shown in the visitor's money.
// Stripe's Payment Link has a manual IDR price (Rp75.000) next to the US$8.99 default and
// picks the currency from the buyer's location (IP). The site asks api.sorot.app/geo for the
// same thing (Cloudflare's country for this IP), so the site and checkout agree, VPN included.
// Until that answers (or if it can't), the device's time zone is the guess.
// window.sorotPriceReady resolves once the region is settled (at most ~1.2 s).
// Anything with data-price gets the right string; window.sorotPrice is there for scripts.
// ?price=id or ?price=us forces one (for checking).
//
// Promo: a link sent from a phone to a Mac carries ?promo=KIRIMMACBOOK (20% off, a Stripe
// promotion code). The Mac's browser remembers it for 30 days, the prices here drop, and
// /buy/ hands it to Stripe as prefilled_promo_code, so the app's "Get Pro" (which opens
// sorot.app/buy in the same browser) gets the discount without typing anything.
(() => {
  const PRICES = { id: "Rp75.000", us: "$8.99" };
  const PROMOS = { KIRIMMACBOOK: { id: "Rp60.000", us: "$7.19" } };
  const KEY = "sorot-promo";
  const DAYS = 30;

  const here = new URLSearchParams(location.search);
  const force = here.get("price");
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  const inIndonesia = /^Asia\/(Jakarta|Pontianak|Makassar|Jayapura)$/.test(zone);
  let key = PRICES[force] ? force : inIndonesia ? "id" : "us";

  let promo = "";
  const fromLink = (here.get("promo") || "").toUpperCase();
  try {
    if (PROMOS[fromLink]) localStorage.setItem(KEY, JSON.stringify({ code: fromLink, until: Date.now() + DAYS * 864e5 }));
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && PROMOS[saved.code] && saved.until > Date.now()) promo = saved.code;
  } catch {
    if (PROMOS[fromLink]) promo = fromLink;
  }

  window.sorotPromo = promo;
  window.sorotPromoPrice = (code) => PROMOS[code]?.[key];
  const set = (k) => {
    key = k;
    window.sorotPrice = PRICES[key];
    window.sorotPriceRegion = key;
  };
  const apply = () => {
    const shown = promo ? PROMOS[promo][key] : PRICES[key];
    document.querySelectorAll("[data-price]").forEach((el) => (el.textContent = shown));
  };
  const applySoon = () => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
    else apply();
  };
  set(key);
  applySoon();

  const fromCountry = (c) => (c === "ID" ? "id" : "us");
  const lookup = async () => {
    if (PRICES[force]) return;
    let country = "";
    try { country = sessionStorage.getItem("sorot-country") || ""; } catch {}
    if (!country) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 1200);
      try {
        const res = await fetch("https://api.sorot.app/geo", { signal: ctl.signal, cache: "no-store" });
        country = ((await res.json()).country || "").toUpperCase();
        if (/^[A-Z]{2}$/.test(country)) { try { sessionStorage.setItem("sorot-country", country); } catch {} }
      } catch {}
      clearTimeout(timer);
    }
    if (/^[A-Z]{2}$/.test(country) && country !== "XX" && country !== "T1") {
      set(fromCountry(country));
      applySoon();
    }
  };
  window.sorotPriceReady = lookup();
})();
