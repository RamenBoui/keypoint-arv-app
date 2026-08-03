// The Answer — three locked outputs, never one number (agents/arv/README.md):
// the band (P50 leads), the breakeven strip when deal numbers exist, and the
// per-tier matrix. Confidence and notes render VERBATIM — honesty is the
// product. All figures come from arv-agent; this screen only formats.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fmtMoney, fmtMoneyFull, fmtPsf, fmtInt, numOrNull } from "../util";
import { Card, Divider, Field, GhostButton, GroupLabel, Pill, PrimaryButton } from "../components/ui";
import ContextTabs from "../components/ContextTabs";
import { shareReport } from "../report";
import { copyShareUrl, shareUrl } from "../share";
import { colors, type } from "../theme";

const CONF_TONE = { high: "green", medium: "amber", low: "red" };

function BandCard({ t, band, compSet, basisNote }) {
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
          <Text style={type.moneySubmit}>{fmtMoney(band.arv?.p50)}</Text>
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
        {compSet && <Text style={type.spec}>{compSet.used} {t("compsUsed")}</Text>}
      </View>
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

function BreakevenCard({ t, breakeven, deal, onEdit }) {
  const under = typeof breakeven.verdict === "string" && breakeven.verdict.includes("UNDER");
  return (
    <Card style={s.beCard}>
      <GroupLabel>{t("breakevenVsDeal")}</GroupLabel>
      <View style={s.beRow}>
        <View style={s.beCell}>
          <Text style={type.microLabel}>{t("breakeven")}</Text>
          <Text style={s.beMoney}>{fmtPsf(breakeven.breakeven_psf)}</Text>
        </View>
        <View style={s.beCell}>
          <Text style={type.microLabel}>{t("redLine")}</Text>
          <Text style={s.beMoney}>{fmtPsf(breakeven.redline_psf)}</Text>
        </View>
        {typeof breakeven.cushion_pct_vs === "number" && (
          <View style={s.beCell}>
            <Text style={type.microLabel}>{t("cushionVsP50")}</Text>
            <Text style={s.beMoney}>{`${(breakeven.cushion_pct_vs * 100).toFixed(1)}%`}</Text>
          </View>
        )}
      </View>
      <Text style={[type.bodyStrong, { color: under ? colors.red : colors.green, marginTop: 8 }]}>
        {breakeven.verdict}
      </Text>
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
    <Card style={s.beCard}>
      <GroupLabel>{t("seeTheCushion")}</GroupLabel>
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
  const { band, breakeven, tiers, comp_set, basis_note, posture } = result;

  return (
    <View style={s.wrap}>
      <Text style={type.screenTitle} numberOfLines={2}>{run.addressText}</Text>
      <Text style={[type.spec, s.postureLine]}>
        {t("posture")} {posture} · {fmtInt(run.subject.square_feet)} {t("sfSubject")}
        {run.subject.total_sf_after ? ` → ${fmtInt(run.subject.total_sf_after)} ${t("sfOnceBuilt")}` : ""}
      </Text>

      <BandCard t={t} band={band} compSet={comp_set} basisNote={basis_note} />
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

      {result.footer ? <Text style={[type.spec, s.footer]}>{result.footer}</Text> : null}

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
  postureLine: { marginTop: 4, marginBottom: 14 },
  bandCard: { marginBottom: 12 },
  bandRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4 },
  bandMid: { alignItems: "center", flex: 1.3 },
  bandSide: { alignItems: "center", flex: 1 },
  bandSideMoney: { ...type.moneyForm, color: colors.textSecondary },
  confRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  scream: { ...type.bodyStrong, color: colors.red, marginTop: 10 },
  note: { marginTop: 8 },
  beCard: { marginBottom: 12 },
  beRow: { flexDirection: "row", gap: 12 },
  beCell: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 8, padding: 10, alignItems: "center" },
  beMoney: { ...type.moneyForm },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tierCode: { ...type.projectCode, width: 26 },
  tierPsf: { ...type.rowAmount, width: 74, textAlign: "right" },
  tierMoney: { ...type.rowAmount, width: 74, textAlign: "right" },
  footer: { marginTop: 12, textAlign: "center" },
});
