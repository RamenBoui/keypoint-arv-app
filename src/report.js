// The one-page ARV report (AV-09) — a realtor's deliverable is the DEFENSE,
// not the number, so the PDF carries the band, the comp table WITH the
// evidence flags, the confidence sentence verbatim, and the basis note.
// Rendered on-device from the last engine response; nothing recomputed here
// beyond display formatting.
//
// Native: expo-print → PDF file → native share sheet (DD-app pattern).
// Web: a print window — the browser's "Save as PDF" is the share.
import { Platform } from "react-native";
import { makeT } from "./i18n";
import { fmtMoney, fmtMoneyFull, fmtPsf, fmtInt } from "./util";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildReportHtml(run, result, lang = "en") {
  const t = makeT(lang);
  const { band, breakeven, tiers, comp_set, basis_note, posture, footer } = result;
  const conf = comp_set?.confidence ?? "low";
  const noSold = comp_set?.evidence === "listings_or_unflagged";
  const today = new Date().toISOString().slice(0, 10);

  const compRows = run.comps.map((c) => `
    <tr>
      <td>${esc(c.address || c.id)}</td>
      <td class="num">${esc(fmtMoneyFull(c.sale_price))}</td>
      <td class="num">${esc(fmtInt(c.square_feet))}</td>
      <td class="num">${esc(fmtPsf(c.sale_price / c.square_feet))}</td>
      <td class="flag">${c.closed ? t("pdfSoldFlag") : "—"}</td>
      <td class="flag">${c.renovated ? t("pdfRenovatedFlag") : "—"}</td>
    </tr>`).join("");

  const tierRows = (tiers ?? []).map((t) => `
    <tr>
      <td class="mono">${esc(t.tier)}</td>
      <td>${esc(t.label)}</td>
      <td class="num">${esc(fmtInt(t.total_sf))}</td>
      <td class="num">${esc(fmtPsf(t.exit_psf))}</td>
      <td class="num">${esc(fmtMoney(t.arv_p50))}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8">
<title>ARV — ${esc(run.addressText)}</title>
<style>
  @page { margin: 14mm; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #2a2622; background: #fff; margin: 0; font-size: 12px; line-height: 1.45; }
  .brand { font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  h1 { font-size: 19px; margin: 2px 0 0; letter-spacing: -0.4px; }
  .meta { color: #7a736a; font-family: ui-monospace, Menlo, monospace; font-size: 10px; margin-top: 2px; }
  .band { display: flex; gap: 10px; margin: 14px 0 4px; }
  .cell { flex: 1; border: 1px solid rgba(42,38,34,0.15); border-radius: 8px; padding: 10px 12px; text-align: center; }
  .cell .lbl { font-family: ui-monospace, Menlo, monospace; font-size: 8.5px; letter-spacing: 1px; color: #8a857c; text-transform: uppercase; }
  .cell .money { font-size: 17px; font-weight: 800; margin-top: 3px; }
  .cell.mid { background: #faf6ee; } .cell.mid .money { font-size: 22px; }
  .conf { display: inline-block; border-radius: 999px; padding: 2px 10px; font-family: ui-monospace, Menlo, monospace; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
  .conf.high { background: #15803d22; color: #15803d; } .conf.medium { background: #a1620722; color: #a16207; } .conf.low { background: #b91c1c22; color: #b91c1c; }
  .scream { color: #b91c1c; font-weight: 700; margin: 6px 0; }
  .note { color: #5f5951; font-size: 11px; margin-top: 6px; }
  h2 { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #8a857c; margin: 18px 0 6px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #8a857c; padding: 4px 6px; border-bottom: 1px solid rgba(42,38,34,0.2); }
  td { padding: 5px 6px; border-bottom: 1px solid rgba(42,38,34,0.09); vertical-align: top; }
  td.num, th.num { text-align: right; font-family: ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; }
  td.flag { font-size: 11px; color: #15803d; white-space: nowrap; }
  td.mono { font-family: ui-monospace, Menlo, monospace; color: #d95a1f; font-weight: 700; }
  .be { display: flex; gap: 10px; margin-top: 6px; }
  .verdict { font-weight: 700; margin-top: 8px; }
  .verdict.under { color: #b91c1c; } .verdict.clear { color: #15803d; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid rgba(42,38,34,0.15); color: #7a736a; font-size: 10px; }
</style></head><body>
  <div class="brand">Keypoint · ARV</div>
  <h1>${esc(run.addressText)}</h1>
  <div class="meta">${esc(fmtInt(run.subject.square_feet))} ${t("pdfSubject")}${run.subject.total_sf_after ? ` → ${esc(fmtInt(run.subject.total_sf_after))} ${t("pdfOnceBuilt")}` : ""} · posture: ${esc(posture)} · ${today}</div>

  <div class="band">
    <div class="cell"><div class="lbl">${t("p20Stress")}</div><div class="money">${esc(fmtMoney(band.arv?.p20))}</div><div class="meta">${esc(fmtPsf(band.exit_psf?.p20))}</div></div>
    <div class="cell mid"><div class="lbl">${t("p50Working")}</div><div class="money">${esc(fmtMoney(band.arv?.p50))}</div><div class="meta">${esc(fmtPsf(band.exit_psf?.p50))}</div></div>
    <div class="cell"><div class="lbl">${t("p80Upside")}</div><div class="money">${esc(fmtMoney(band.arv?.p80))}</div><div class="meta">${esc(fmtPsf(band.exit_psf?.p80))}</div></div>
  </div>
  <span class="conf ${esc(conf)}">${t("pdfConfidence")} ${esc(conf)}</span>
  ${comp_set ? `<span class="meta"> · ${comp_set.used} ${t("pdfCompsUsed")}</span>` : ""}
  ${noSold ? `<div class="scream">${t("noneSoldScream")}</div>` : ""}
  <div class="note">${esc(comp_set?.note ?? basis_note ?? "")}</div>
  ${run.subject.asIsAvm ? `<div class="note">${t("pdfAsIs")} <b>${esc(fmtMoney(run.subject.asIsAvm))}</b>${band?.arv?.p50 ? ` · ${t("pdfAfterWork")} <b>${esc(fmtMoney(band.arv.p50))}</b> · ${t("pdfTheGap")} <b>${band.arv.p50 - run.subject.asIsAvm >= 0 ? "+" : "−"}${esc(fmtMoney(Math.abs(band.arv.p50 - run.subject.asIsAvm)))}</b>` : ""}${run.subject.marketRent ? ` · ${t("pdfMarketRent")} ${esc(fmtMoneyFull(run.subject.marketRent))}/mo` : ""}</div>` : ""}

  ${breakeven ? `
  <h2>${t("pdfBreakevenH")}</h2>
  <div class="be">
    <div class="cell"><div class="lbl">${t("pdfBreakeven")}</div><div class="money">${esc(fmtPsf(breakeven.breakeven_psf))}</div></div>
    <div class="cell"><div class="lbl">${t("pdfRedLine")}</div><div class="money">${esc(fmtPsf(breakeven.redline_psf))}</div></div>
    ${typeof breakeven.cushion_pct_vs === "number" ? `<div class="cell"><div class="lbl">${t("pdfCushion")}</div><div class="money">${(breakeven.cushion_pct_vs * 100).toFixed(1)}%</div></div>` : ""}
  </div>
  <div class="verdict ${String(breakeven.verdict).includes("UNDER") ? "under" : "clear"}">${esc(breakeven.verdict)}</div>
  <div class="note">${esc(fmtMoneyFull(run.deal?.purchase_price))} ${t("purchase")} · ${esc(fmtMoneyFull(run.deal?.build_cost))} ${t("build")} · ${esc(run.deal?.term_months)} ${t("mo")}</div>` : ""}

  <h2>${t("pdfCompsH")}</h2>
  <table>
    <tr><th>${t("pdfAddress")}</th><th class="num">${t("pdfSale")}</th><th class="num">SF</th><th class="num">$/SF</th><th>${t("pdfClosed")}</th><th>${t("pdfRenovated")}</th></tr>
    ${compRows}
  </table>
  <div class="note">${t("pdfFlagsNote")}</div>

  <h2>${t("pdfTiersH")}</h2>
  <table>
    <tr><th>${t("pdfTier")}</th><th>${t("pdfScope")}</th><th class="num">SF</th><th class="num">${t("pdfExitPsf")}</th><th class="num">${t("pdfArvP50")}</th></tr>
    ${tierRows}
  </table>

  <div class="footer">${esc(footer ?? "")}<br/>${t("pdfFooter")}</div>
</body></html>`;
}

export async function shareReport(run, result, lang = "en") {
  const html = buildReportHtml(run, result, lang);
  if (Platform.OS === "web") {
    // The browser's print dialog IS the PDF path on web (Save as PDF /
    // share). Printed through a hidden SAME-PAGE iframe: popup blockers
    // killed window.open silently on phones, and an iframe has nothing to
    // block. Cleaned up after the dialog closes.
    try {
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      doc.open();
      doc.write(html);
      doc.close();
      await new Promise((res) => setTimeout(res, 250)); // fonts/layout beat
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60_000);
      return { ok: true };
    } catch {
      return { ok: false, reason: "print-failed" };
    }
  }
  try {
    const Print = require("expo-print");
    const Sharing = require("expo-sharing");
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share ARV report" });
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "print-failed" };
  }
}
