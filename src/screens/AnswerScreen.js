// The Answer — three locked outputs, never one number (agents/arv/README.md):
// the band (P50 leads), the breakeven strip when deal numbers exist, and the
// per-tier matrix. Confidence and notes render VERBATIM — honesty is the
// product. All figures come from arv-agent; this screen only formats.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fmtMoney, fmtMoneyFull, fmtMoneyK, fmtPsf, fmtInt, numOrNull } from "../util";
import { Card, Divider, Field, GhostButton, GroupLabel, Pill, PrimaryButton } from "../components/ui";
import ContextTabs from "../components/ContextTabs";
import { shareReport } from "../report";
import { copyShareUrl, shareUrl } from "../share";
import { colors, type } from "../theme";

const CONF_TONE = { high: "green", medium: "amber", low: "red" };

// Redesign 2026-08-06 (Jeffrey): one hero number, one quiet meta line.
// Confidence rides the header as a pill; used/excluded/§03 compress into a
// single line (amber only for the warnings); the basis sentence collapses to
// one line and expands on tap — the PDF always carries it in full.
function BandCard({ t, band, compSet, basisNote, totalComps, ceilingPct }) {
  const [showBasis, setShowBasis] = useState(false);
  const conf = compSet?.confidence ?? "low";
  const noSold = compSet && compSet.evidence === "listings_or_unflagged";
  const note = compSet?.note ?? basisNote;
  return (
    <Card style={s.bandCard}>
      <View style={s.cardHead}>
        <GroupLabel style={{ marginBottom: 0 }}>{t("arvBand")}</GroupLabel>
        <Pill text={`${t("confidence")} ${String(conf).toUpperCase()}`} tone={CONF_TONE[conf] ?? "red"} />
      </View>
      <View style={s.heroWrap}>
        <Text style={type.microLabel}>{t("p50Working")}</Text>
        <Text style={s.bandMidMoney}>{fmtMoney(band.arv?.p50)}</Text>
        <Text style={s.midPsf}>{fmtPsf(band.exit_psf?.p50)}</Text>
      </View>
      <View style={s.flankRow}>
        <View>
          <Text style={s.sideLabel}>{t("p20Stress")}</Text>
          <Text style={s.bandSideMoney}>{fmtMoneyK(band.arv?.p20)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.sideLabel}>{t("p80Upside")}</Text>
          <Text style={s.bandSideMoney}>{fmtMoneyK(band.arv?.p80)}</Text>
        </View>
      </View>
      {compSet ? (
        <Text style={s.metaText}>
          {compSet.used}{totalComps ? `/${totalComps}` : ""} {t("compsUsed")}
          {compSet?.excluded?.length ? (
            <Text style={{ color: colors.amber }}> · {compSet.excluded.length} {t("excludedShort")}</Text>
          ) : null}
          {band.ceiling_applied && ceilingPct ? (
            <Text style={{ color: colors.amber }}> · {t("ceilingShort")} −{Math.round(ceilingPct * 100)}%</Text>
          ) : null}
        </Text>
      ) : null}
      {noSold && (
        <Text style={s.scream}>{t("noneSoldScream")}</Text>
      )}
      {note ? (
        <Pressable onPress={() => setShowBasis((v) => !v)} hitSlop={6}>
          <Text style={[type.spec, s.note]} numberOfLines={showBasis ? undefined : 1}>
            {note}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

// X-05/X-06, restructured 2026-08-06: the as-is → gap delta rides inside the
// deal card as one quiet line instead of its own three-tile card — the AFTER
// figure was a duplicate of the band hero. Display subtraction only.
function DealContext({ t, subject, band }) {
  const avm = subject.asIsAvm;
  const rent = subject.marketRent;
  if (!avm && !rent) return null;
  const p50 = band?.arv?.p50;
  const delta = avm && p50 ? p50 - avm : null;
  return (
    <View style={s.dealCtx}>
      {avm ? (
        <Text style={s.ctxLine}>
          <Text style={s.ctxLabel}>{t("asIsAvm")}  </Text>
          <Text style={s.ctxMoney}>{fmtMoneyFull(avm)}</Text>
          {delta !== null ? (
            <>
              <Text style={s.ctxLabel}>   ·   {t("theGap")}  </Text>
              <Text style={[s.ctxMoney, { color: delta >= 0 ? colors.green : colors.red }]}>
                {delta >= 0 ? "+" : "−"}{fmtMoney(Math.abs(delta))}
              </Text>
            </>
          ) : null}
        </Text>
      ) : null}
      {delta !== null && delta < 0 && (
        <Text style={[type.spec, { color: colors.amber, marginTop: 4 }]}>
          {t("avmAboveNote")}
        </Text>
      )}
      {rent ? (
        <Text style={s.metaText}>{t("marketRentLine")} {fmtMoneyFull(rent)}{t("holdAnchor")}</Text>
      ) : null}
    </View>
  );
}

// The cushion leads this card: Franc's "most useful single number" is the
// distance between breakeven and what the market has proven — so it gets the
// band's own visual grammar (big toned center, quiet sides) and the verdict
// renders VERBATIM on a toned strip. One color carries the whole card.
function BreakevenCard({ t, breakeven, deal, ceilingPct, subject, band, onEdit }) {
  const under = typeof breakeven.verdict === "string" && breakeven.verdict.includes("UNDER");
  const tone = under ? colors.red : colors.green;
  const pct = typeof breakeven.cushion_pct_vs === "number" ? breakeven.cushion_pct_vs * 100 : null;
  return (
    <Card style={s.beCard}>
      <GroupLabel>{t("breakevenVsDeal")}</GroupLabel>
      <View style={s.beBandRow}>
        <View style={s.beSide}>
          <Text style={type.microLabel}>{t("breakeven")}</Text>
          <Text style={s.beSideMoney}>{fmtPsf(breakeven.breakeven_psf)}</Text>
        </View>
        {pct !== null && (
          <View style={s.beMid}>
            <Text style={type.microLabel}>{t("cushionVsP50")}</Text>
            <Text style={[s.beCushion, { color: tone }]}>
              {pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}%
            </Text>
          </View>
        )}
        <View style={s.beSide}>
          <Text style={type.microLabel}>{t("redLine")}</Text>
          <Text style={s.beSideMoney}>{fmtPsf(breakeven.redline_psf)}</Text>
        </View>
      </View>
      <View style={[s.verdictStrip, { backgroundColor: `${tone}18` }]}>
        <Text style={[s.verdictText, { color: tone }]}>{breakeven.verdict}</Text>
      </View>
      <DealContext t={t} subject={subject} band={band} />
      <Text style={[s.metaText, s.note]}>
        {fmtMoneyFull(deal.purchase_price)} {t("purchase")} · {fmtMoneyFull(deal.build_cost)} {t("build")} · {deal.term_months} {t("mo")}
        {ceilingPct ? ` · −${Math.round(ceilingPct * 100)}% ${t("ceilingShort")}` : ""}
      </Text>
      <GhostButton title={t("editDeal")} onPress={onEdit} />
    </Card>
  );
}

function DealForm({ t, initial, initialCeiling, subject, band, onRun, busy }) {
  const [purchase, setPurchase] = useState(initial?.purchase_price ? String(initial.purchase_price) : "");
  const [build, setBuild] = useState(initial?.build_cost ? String(initial.build_cost) : "");
  const [term, setTerm] = useState(initial?.term_months ? String(initial.term_months) : "6");
  const [ceiling, setCeiling] = useState(
    typeof initialCeiling === "number" && initialCeiling > 0 ? String(Math.round(initialCeiling * 100)) : ""
  );
  const p = numOrNull(purchase);
  const b = parseFloat(String(build).replace(/[$,]/g, ""));
  const tm = numOrNull(term);
  // §03 ceiling — optional; whole percent in, fraction to the engine (15 →
  // 0.15, contract caps at 0.5). Blank means no ceiling, exactly as before.
  const cRaw = String(ceiling).replace(/%/g, "").trim();
  const cNum = parseFloat(cRaw);
  const cOk = cRaw === "" || (isFinite(cNum) && cNum >= 0 && cNum <= 50);
  const cFrac = cOk && cRaw !== "" && cNum > 0 ? cNum / 100 : null;
  const ok = p && tm && isFinite(b) && b >= 0 && cOk;
  const submit = () => onRun({ purchase_price: p, build_cost: b, term_months: tm }, cFrac);
  return (
    <Card style={[s.beCard, s.dealInviteCard]}>
      <GroupLabel style={{ color: colors.accent }}>{t("seeTheCushion")}</GroupLabel>
      <Text style={[type.body, { marginBottom: 4 }]}>{t("dealInvite")}</Text>
      <DealContext t={t} subject={subject} band={band} />
      <View style={{ height: 10 }} />
      <Field label={t("purchasePrice")} value={purchase} onChangeText={setPurchase} placeholder="800000" keyboardType="numeric" />
      <Field label={t("buildCost")} value={build} onChangeText={setBuild} placeholder="150000" keyboardType="numeric" />
      <Field
        label={t("termMonths")}
        value={term}
        onChangeText={setTerm}
        placeholder="6"
        keyboardType="numeric"
        onSubmitEditing={() => { if (ok && !busy) submit(); }}
      />
      <Field
        label={t("ceilingPct")}
        value={ceiling}
        onChangeText={setCeiling}
        placeholder="15"
        keyboardType="numeric"
        onSubmitEditing={() => { if (ok && !busy) submit(); }}
      />
      <Text style={[type.spec, s.ceilingHint]}>{t("ceilingHint")}</Text>
      <PrimaryButton
        title={busy ? t("running") : t("showBreakeven")}
        onPress={submit}
        disabled={!ok || busy}
      />
    </Card>
  );
}

export default function AnswerScreen({ t, lang, run, result, busy, onRunDeal, onBack, onNewAddress }) {
  const [editingDeal, setEditingDeal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [showTiers, setShowTiers] = useState(false);
  const { band, breakeven, tiers, comp_set, basis_note, posture } = result;

  return (
    <View style={s.wrap}>
      <Text style={type.screenTitle} numberOfLines={2}>{run.addressText}</Text>
      <View style={s.postureLine}>
        <Pill
          text={
            posture === "licensed_mls" ? t("evidenceMls")
            : posture === "public_record" ? t("evidencePublic")
            : t("evidenceClient")
          }
        />
        <Text style={type.spec}>
          {fmtInt(run.subject.square_feet)}
          {run.subject.total_sf_after ? ` → ${fmtInt(run.subject.total_sf_after)}` : ""} SF
        </Text>
      </View>

      <BandCard t={t} band={band} compSet={comp_set} basisNote={basis_note} totalComps={run.comps?.length} ceilingPct={run.ceiling_pct} />

      {breakeven && !editingDeal ? (
        <BreakevenCard t={t} breakeven={breakeven} deal={run.deal} ceilingPct={run.ceiling_pct} subject={run.subject} band={band} onEdit={() => setEditingDeal(true)} />
      ) : (
        <DealForm
          t={t}
          initial={run.deal}
          initialCeiling={run.ceiling_pct}
          subject={run.subject}
          band={band}
          busy={busy}
          onRun={(deal, cpct) => { setEditingDeal(false); onRunDeal(deal, cpct); }}
        />
      )}

      {/* Expert detail folds until asked — same progressive-disclosure move
          as locked params; the PDF always prints the full tier table. */}
      <Card>
        <Pressable onPress={() => setShowTiers((v) => !v)} hitSlop={6}>
          <View style={s.cardHead}>
            <GroupLabel style={{ marginBottom: 0 }}>{t("arvPerTier")}</GroupLabel>
            <Text style={s.chev}>{showTiers ? "▾" : "▸"}</Text>
          </View>
        </Pressable>
        {showTiers && (
          <View style={{ marginTop: 6 }}>
            {(tiers ?? []).map((t) => (
              <View key={t.tier} style={s.tierRow}>
                <Text style={s.tierCode}>{t.tier}</Text>
                <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>{t.label}</Text>
                <Text style={s.tierPsf}>{fmtPsf(t.exit_psf)}</Text>
                <Text style={s.tierMoney}>{fmtMoney(t.arv_p50)}</Text>
              </View>
            ))}
            <Text style={[type.spec, s.note]}>
              {t("tiersNote")}
            </Text>
          </View>
        )}
      </Card>

      <ContextTabs t={t} run={run} />

      {/* The equation stays available, not ambient: the locked conventions
          expand on demand here, and always print in full on the PDF. */}
      {result.footer ? (
        <Pressable onPress={() => setShowParams((v) => !v)} hitSlop={6}>
          <Text style={[type.spec, s.paramsToggle]}>
            {t("lockedParams")} {showParams ? "▾" : "▸"}
          </Text>
        </Pressable>
      ) : null}
      {showParams && result.footer ? <Text style={[type.spec, s.footer]}>{result.footer}</Text> : null}

      <Divider />
      <PrimaryButton title={t("shareAsPdf")} onPress={() => shareReport(run, result, lang)} />
      {shareUrl(run) && (
        <>
          <View style={{ height: 8 }} />
          <GhostButton
            title={copied ? t("linkCopied") : t("copyShareLink")}
            onPress={async () => {
              if (await copyShareUrl(run)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }
            }}
          />
        </>
      )}
      <View style={{ height: 8 }} />
      <GhostButton title={t("adjustComps")} onPress={onBack} />
      <GhostButton title={t("newAddress")} tone="accent" onPress={onNewAddress} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  postureLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 14 },
  bandCard: { marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroWrap: { alignItems: "center", marginTop: 14 },
  bandMidMoney: { ...type.moneySubmit, fontSize: 34, letterSpacing: -1 },
  flankRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  bandSideMoney: { ...type.moneyForm, fontSize: 16, letterSpacing: -0.4, color: colors.textMuted },
  sideLabel: { ...type.microLabel, color: colors.textMuted },
  midPsf: { ...type.spec, marginTop: 2 },
  metaText: { ...type.spec, color: colors.textMuted, marginTop: 10 },
  chev: { ...type.bodyStrong, color: colors.textMuted },
  scream: { ...type.bodyStrong, color: colors.red, marginTop: 10 },
  note: { marginTop: 8 },
  beCard: { marginBottom: 12 },
  dealCtx: { marginTop: 10 },
  ctxLine: { lineHeight: 20 },
  ctxLabel: { ...type.microLabel, color: colors.textMuted },
  ctxMoney: { ...type.moneyForm, fontSize: 15 },
  beBandRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4, gap: 6 },
  beMid: { alignItems: "center", flex: 1.2 },
  beSide: { alignItems: "center", flex: 1 },
  beSideMoney: { ...type.moneyForm, fontSize: 18, letterSpacing: -0.45, color: colors.textSecondary },
  beCushion: { ...type.moneySubmit, fontSize: 31, letterSpacing: -0.95 },
  verdictStrip: { marginTop: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  verdictText: { ...type.bodyStrong, fontSize: 15 },
  dealInviteCard: { borderColor: colors.accent, borderWidth: 1 },
  ceilingHint: { marginTop: -6, marginBottom: 12, color: colors.textMuted },
  paramsToggle: { color: colors.textMuted, marginTop: 12, textAlign: "center" },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tierCode: { ...type.projectCode, width: 26 },
  tierPsf: { ...type.rowAmount, width: 74, textAlign: "right" },
  tierMoney: { ...type.rowAmount, width: 74, textAlign: "right" },
  footer: { marginTop: 12, textAlign: "center" },
});
