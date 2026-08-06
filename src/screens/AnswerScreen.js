// The Answer — three locked outputs, never one number (agents/arv/README.md):
// the band (P50 leads), the breakeven strip when deal numbers exist, and the
// per-tier matrix. Confidence and notes render VERBATIM — honesty is the
// product. All figures come from arv-agent; this screen only formats.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fmtMoney, fmtMoneyFull, fmtPsf, fmtInt, numOrNull } from "../util";
import { Card, Divider, Field, GhostButton, GroupLabel, Pill, PrimaryButton } from "../components/ui";
import ContextTabs from "../components/ContextTabs";
import { shareReport } from "../report";
import { copyShareUrl, shareUrl } from "../share";
import { colors, type } from "../theme";

const CONF_TONE = { high: "green", medium: "amber", low: "red" };

function BandCard({ t, band, compSet, basisNote, totalComps }) {
  const conf = compSet?.confidence ?? "low";
  const noSold = compSet && compSet.evidence === "listings_or_unflagged";
  return (
    <Card style={s.bandCard}>
      <GroupLabel>{t("arvBand")}</GroupLabel>
      <View style={s.bandRow}>
        <View style={s.bandSide}>
          <Text style={type.microLabel}>{t("p20Stress")}</Text>
          <Text style={s.bandSideMoney}>{fmtMoney(band.arv?.p20)}</Text>
          <Text style={type.spec}>{fmtPsf(band.exit_psf?.p20)}</Text>
        </View>
        <View style={s.bandMid}>
          <Text style={type.microLabel}>{t("p50Working")}</Text>
          <Text style={s.bandMidMoney}>{fmtMoney(band.arv?.p50)}</Text>
          <Text style={type.spec}>{fmtPsf(band.exit_psf?.p50)}</Text>
        </View>
        <View style={s.bandSide}>
          <Text style={type.microLabel}>{t("p80Upside")}</Text>
          <Text style={s.bandSideMoney}>{fmtMoney(band.arv?.p80)}</Text>
          <Text style={type.spec}>{fmtPsf(band.exit_psf?.p80)}</Text>
        </View>
      </View>
      <View style={s.confRow}>
        <Pill text={`${t("confidence")} ${String(conf).toUpperCase()}`} tone={CONF_TONE[conf] ?? "red"} />
        {compSet && (
          <Text style={type.spec}>
            {compSet.used}{totalComps ? ` ${t("of")} ${totalComps}` : ""} {t("compsUsed")}
          </Text>
        )}
      </View>
      {compSet?.excluded?.length ? (
        <Text style={[type.spec, { color: colors.amber, marginTop: 6 }]}>
          {compSet.excluded.length} {t("excludedNote")}
        </Text>
      ) : null}
      {noSold && (
        <Text style={s.scream}>{t("noneSoldScream")}</Text>
      )}
      <Text style={[type.spec, s.note]}>{compSet?.note ?? basisNote}</Text>
    </Card>
  );
}

// X-05/X-06 — the margin is the product: put today's numbers (as-is AVM,
// market rent — both straight from enrichment) beside the after-work P50 so
// the delta reads at a glance. Display subtraction only, no valuation math.
function TodayVsAfter({ t, subject, band }) {
  const avm = subject.asIsAvm;
  const rent = subject.marketRent;
  if (!avm && !rent) return null;
  const p50 = band?.arv?.p50;
  const delta = avm && p50 ? p50 - avm : null;
  return (
    <Card style={s.beCard}>
      <GroupLabel>{t("todayVsAfter")}</GroupLabel>
      <View style={s.beRow}>
        {avm ? (
          <View style={s.beCell}>
            <Text style={type.microLabel}>{t("asIsAvm")}</Text>
            <Text style={s.beMoney}>{fmtMoney(avm)}</Text>
          </View>
        ) : null}
        {p50 ? (
          <View style={s.beCell}>
            <Text style={type.microLabel}>{t("afterP50")}</Text>
            <Text style={s.beMoney}>{fmtMoney(p50)}</Text>
          </View>
        ) : null}
        {delta !== null ? (
          <View style={s.beCell}>
            <Text style={type.microLabel}>{t("theGap")}</Text>
            <Text style={[s.beMoney, { color: delta >= 0 ? colors.green : colors.red }]}>
              {delta >= 0 ? "+" : "−"}{fmtMoney(Math.abs(delta))}
            </Text>
          </View>
        ) : null}
      </View>
      {delta !== null && delta < 0 && (
        <Text style={[type.spec, s.note, { color: colors.amber }]}>
          {t("avmAboveNote")}
        </Text>
      )}
      {rent ? (
        <Text style={[type.spec, s.note]}>{t("marketRentLine")} {fmtMoneyFull(rent)}{t("holdAnchor")}</Text>
      ) : null}
    </Card>
  );
}

// The cushion leads this card: Franc's "most useful single number" is the
// distance between breakeven and what the market has proven — so it gets the
// band's own visual grammar (big toned center, quiet sides) and the verdict
// renders VERBATIM on a toned strip. One color carries the whole card.
function BreakevenCard({ t, breakeven, deal, onEdit }) {
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
      <Text style={[type.spec, s.note]}>
        {fmtMoneyFull(deal.purchase_price)} {t("purchase")} · {fmtMoneyFull(deal.build_cost)} {t("build")} · {deal.term_months} {t("mo")}
      </Text>
      <GhostButton title={t("editDeal")} onPress={onEdit} />
    </Card>
  );
}

function DealForm({ t, initial, onRun, busy }) {
  const [purchase, setPurchase] = useState(initial?.purchase_price ? String(initial.purchase_price) : "");
  const [build, setBuild] = useState(initial?.build_cost ? String(initial.build_cost) : "");
  const [term, setTerm] = useState(initial?.term_months ? String(initial.term_months) : "6");
  const p = numOrNull(purchase);
  const b = parseFloat(String(build).replace(/[$,]/g, ""));
  const tm = numOrNull(term);
  const ok = p && tm && isFinite(b) && b >= 0;
  return (
    <Card style={[s.beCard, s.dealInviteCard]}>
      <GroupLabel style={{ color: colors.accent }}>{t("seeTheCushion")}</GroupLabel>
      <Text style={[type.body, { marginBottom: 10 }]}>{t("dealInvite")}</Text>
      <Field label={t("purchasePrice")} value={purchase} onChangeText={setPurchase} placeholder="800000" keyboardType="numeric" />
      <Field label={t("buildCost")} value={build} onChangeText={setBuild} placeholder="150000" keyboardType="numeric" />
      <Field
        label={t("termMonths")}
        value={term}
        onChangeText={setTerm}
        placeholder="6"
        keyboardType="numeric"
        onSubmitEditing={() => { if (ok && !busy) onRun({ purchase_price: p, build_cost: b, term_months: tm }); }}
      />
      <PrimaryButton
        title={busy ? t("running") : t("showBreakeven")}
        onPress={() => onRun({ purchase_price: p, build_cost: b, term_months: tm })}
        disabled={!ok || busy}
      />
    </Card>
  );
}

export default function AnswerScreen({ t, lang, run, result, busy, onRunDeal, onBack, onNewAddress }) {
  const [editingDeal, setEditingDeal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showParams, setShowParams] = useState(false);
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
          {fmtInt(run.subject.square_feet)} {t("sfSubject")}
          {run.subject.total_sf_after ? ` → ${fmtInt(run.subject.total_sf_after)} ${t("sfOnceBuilt")}` : ""}
        </Text>
      </View>

      <BandCard t={t} band={band} compSet={comp_set} basisNote={basis_note} totalComps={run.comps?.length} />
      <TodayVsAfter t={t} subject={run.subject} band={band} />

      {breakeven && !editingDeal ? (
        <BreakevenCard t={t} breakeven={breakeven} deal={run.deal} onEdit={() => setEditingDeal(true)} />
      ) : (
        <DealForm
          t={t}
          initial={run.deal}
          busy={busy}
          onRun={(deal) => { setEditingDeal(false); onRunDeal(deal); }}
        />
      )}

      <Card>
        <GroupLabel>{t("arvPerTier")}</GroupLabel>
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
  bandRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4, gap: 6 },
  bandMid: { alignItems: "center", flex: 1.3 },
  bandSide: { alignItems: "center", flex: 1 },
  // moneySubmit/moneyForm can't fit three abreast at phone width — the P50
  // was overlapping its neighbors. Same hierarchy, sized to the row.
  bandMidMoney: { ...type.moneySubmit, fontSize: 31, letterSpacing: -0.95 },
  bandSideMoney: { ...type.moneyForm, fontSize: 18, letterSpacing: -0.45, color: colors.textSecondary },
  confRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  scream: { ...type.bodyStrong, color: colors.red, marginTop: 10 },
  note: { marginTop: 8 },
  beCard: { marginBottom: 12 },
  beRow: { flexDirection: "row", gap: 12 },
  beCell: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 8, padding: 10, alignItems: "center" },
  beMoney: { ...type.moneyForm },
  beBandRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4, gap: 6 },
  beMid: { alignItems: "center", flex: 1.2 },
  beSide: { alignItems: "center", flex: 1 },
  beSideMoney: { ...type.moneyForm, fontSize: 18, letterSpacing: -0.45, color: colors.textSecondary },
  beCushion: { ...type.moneySubmit, fontSize: 31, letterSpacing: -0.95 },
  verdictStrip: { marginTop: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  verdictText: { ...type.bodyStrong, fontSize: 15 },
  dealInviteCard: { borderColor: colors.accent, borderWidth: 1 },
  paramsToggle: { color: colors.textMuted, marginTop: 12, textAlign: "center" },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tierCode: { ...type.projectCode, width: 26 },
  tierPsf: { ...type.rowAmount, width: 74, textAlign: "right" },
  tierMoney: { ...type.rowAmount, width: 74, textAlign: "right" },
  footer: { marginTop: 12, textAlign: "center" },
});
