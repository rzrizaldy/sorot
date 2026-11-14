// Sorot Pro's price, shown in the visitor's money.
// Stripe's Payment Link has a manual IDR price (Rp75.000) next to the US$8.99 default and
// picks the currency from the buyer's location. The site guesses the same thing from the
// device's time zone, so a visitor in Indonesia sees Rupiah before checkout too.
// Anything with data-price gets the right string; window.sorotPrice is there for scripts.
// ?price=id or ?price=us forces one (for checking).
(() => {
  const PRICES = { id: "Rp75.000", us: "$8.99" };
  const force = new URLSearchParams(location.search).get("price");
  let zone = "";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  const inIndonesia = /^Asia\/(Jakarta|Pontianak|Makassar|Jayapura)$/.test(zone);
  const key = PRICES[force] ? force : inIndonesia ? "id" : "us";
  window.sorotPrice = PRICES[key];
  window.sorotPriceRegion = key;
  const apply = () => document.querySelectorAll("[data-price]").forEach((el) => (el.textContent = PRICES[key]));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
