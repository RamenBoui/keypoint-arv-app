// Context tabs off the Answer (RA-03, RA-04/GC-02, FL-05, FL-06) — the
// "why is the band what it is" layer, one level deep, never a root nav.
//   Market  what the SOLD set already delivered (scope-agent market_scope;
//           per-comp observations double as the comp-study surface — the
//           solo comp_study endpoint is write-gated for internal callers)
//   Trends  what the area is permitting (market_trends, zero MLS)
//   Stuck?  why isn't this listing selling (listing_diagnostic, computed
//           market half; photos deliberately omitted — must be lawfully held)
// Every response renders the engine's own honesty: comp counts, zip
// warnings, sampled-direction notes, "no construction fix indicated".
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { listingDiagnostic, marketScope, marketTrends } from "../api";
import { fmtInt, fmtMoneyFull, fmtPsf, numOrNull } from "../util";
import { Card, Field, GhostButton, GroupLabel, Pill, PrimaryButton } from "./ui";
import { colors, type } from "../theme";

const TABS = [
  { key: "market", label: "tabMarket" },
  { key: "trends", label: "tabTrends" },
  { key: "stuck", label: "tabStuck" },
];

function Loading({ text }) {
  return (
    <View style={s.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[type.body, { marginLeft: 10, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Market
function MarketTab({ t, run, cache, setCache }) {
  const [busy, setBusy] = useState(false);
  const sold = run.comps.filter((c) => c.closed && c.address);
  const data = cache.market;

  const load = async () => {
    setBusy(true);
    const r = await marketScope(sold, run.address?.city).catch(() => ({ ok: false }));
    setBusy(false);
    setCache((c) => ({ ...c, market: r }));
  };

  if (busy) return <Loading text={t("readingSoldSet")} />;

  if (!data) {
    return (
      <View>
        <Text style={type.body}>{t("marketIntro")}</Text>
        {sold.length === 0 ? (
          <Text style={[type.bodyStrong, s.warn]}>{t("flagOneSoldFirst")}</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            <PrimaryButton title={`${t("readSoldSet")} (${sold.length})`} onPress={load} />
            <Text style={[type.spec, { marginTop: 6, textAlign: "center" }]}>{t("takesAMinute")}</Text>
          </View>
        )}
      </View>
    );
  }
  if (!data.ok) {
    return (
      <View>
        <Text style={[type.bodyStrong, s.warn]}>{data.error || `${t("marketFailed")} (${data.status})`}</Text>
        <GhostButton title={t("tryAgain")} onPress={load} />
      </View>
    );
  }
  const rs = data.required_scope ?? {};
  const comps = data.comps ?? [];
  return (
    <View>
      <Card style={s.block}>
        <GroupLabel>{t("marketDelivers")}</GroupLabel>
        <Text style={s.headline}>
          {rs.tier ?? "?"} {t("work")}{rs.finish ? ` ${t("atFinish")} ${rs.finish}${t("finish") ? ` ${t("finish")}` : ""}` : ""}
        </Text>
        {Array.isArray(rs.must_do) && rs.must_do.length > 0 && (
          <>
            <Text style={[type.microLabel, s.subhead]}>{t("tableStakes")}</Text>
            <View style={s.chipRow}>{rs.must_do.map((w) => <Pill key={w} text={w} tone="ink" />)}</View>
          </>
        )}
        {Array.isArray(rs.consider) && rs.consider.length > 0 && (
          <>
            <Text style={[type.microLabel, s.subhead]}>{t("differentiators")}</Text>
            <View style={s.chipRow}>{rs.consider.map((w) => <Pill key={w} text={w} tone="amber" />)}</View>
          </>
        )}
        {rs.note ? <Text style={[type.spec, s.note]}>{rs.note}</Text> : null}
      </Card>

      <GroupLabel style={s.listLabel}>{t("whatEachCompDid")}</GroupLabel>
      {comps.map((c) => (
        <Card key={c.address} style={s.block}>
          <View style={s.compHead}>
            <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={1}>{c.address}</Text>
            {c.observed_tier ? <Text style={s.tierTag}>{c.observed_tier}</Text> : null}
          </View>
          <Text style={type.spec}>
            {c.exit_psf ? `${fmtPsf(c.exit_psf)} ${t("earned")}` : t("noExitPsf")}
            {c.finish_quality ? ` · ${c.finish_quality} finish` : ""} · {c.evidence}
          </Text>
          {Array.isArray(c.work_categories) && c.work_categories.length > 0 && (
            <View style={s.chipRow}>{c.work_categories.slice(0, 6).map((w) => <Pill key={w} text={w} tone="ink" />)}</View>
          )}
          {c.summary ? <Text style={[type.body, s.note]}>{c.summary}</Text> : null}
          {Array.isArray(c.outstanding) && c.outstanding.length > 0 && (
            <Text style={[type.spec, s.warn]}>{t("outstanding")} {c.outstanding.join("; ")}</Text>
          )}
          {c.permit_note ? <Text style={[type.spec, s.note]}>{c.permit_note}</Text> : null}
        </Card>
      ))}
      {Array.isArray(data.failed) && data.failed.length > 0 && (
        <Text style={[type.spec, s.warn]}>
          {t("couldntRead")} {data.failed.map((f) => f.address).join(", ")}
        </Text>
      )}
      <Text style={[type.spec, s.note]}>
        {t("photosRetained")} {String(data.photos_retained ?? 0)} · {t("analysesPersist")} ({String(data.studies_persisted ?? 0)} {t("saved")})
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- Trends
function TrendsTab({ t, run, cache, setCache }) {
  const [busy, setBusy] = useState(false);
  const data = cache.trends;
  const city = run.address?.city;
  const zip = run.address?.zip || undefined;

  const load = async () => {
    setBusy(true);
    const r = await marketTrends(city, zip).catch(() => ({ ok: false }));
    setBusy(false);
    setCache((c) => ({ ...c, trends: r }));
  };

  if (busy) return <Loading text={t("countingPermits")} />;
  if (!data) {
    return (
      <View>
        <Text style={type.body}>{t("trendsIntro1")} {city} {t("trendsIntro2")}</Text>
        <View style={{ marginTop: 12 }}>
          <PrimaryButton title={`${t("readPermitsOf")} ${city}${zip ? ` (${zip})` : ""}`} onPress={load} />
        </View>
      </View>
    );
  }
  if (!data.ok) {
    return (
      <View>
        <Text style={[type.bodyStrong, s.warn]}>{data.error || `${t("trendsFailed")} (${data.status})`}</Text>
        <GhostButton title={t("tryAgain")} onPress={load} />
      </View>
    );
  }
  if (data.covered === false) {
    const cities = (data.supported ?? []).flatMap((sr) => sr.cities?.slice(0, 2) ?? []).slice(0, 6);
    return <Text style={type.body}>{t("noFeedFor")} {data.city}{t("yetCovered")} {cities.join(", ")}…</Text>;
  }
  const rows = data.what_the_market_wants ?? [];
  return (
    <View>
      {data.trends?.headline ? <Text style={[type.bodyStrong, s.block]}>{data.trends.headline}</Text> : null}
      {data.area?.zip_filter_applied === false && (
        <Text style={[type.spec, s.warn]}>{data.area.zip_warning}</Text>
      )}
      <Card style={s.block}>
        <View style={s.trow}>
          <Text style={[s.th, { flex: 1 }]}>{t("thWork")}</Text>
          <Text style={[s.th, s.tnum]}>{t("thPermits")}</Text>
          <Text style={[s.th, s.tnum]}>{t("thShare")}</Text>
          <Text style={[s.th, s.tnum]}>{t("thMedian")}</Text>
          <Text style={[s.th, s.tdir]}>{t("thDir")}</Text>
        </View>
        {rows.map((r) => (
          <View key={r.work} style={s.trow}>
            <Text style={[type.body, { flex: 1 }]}>{r.work}</Text>
            <Text style={[s.td, s.tnum]}>{fmtInt(r.permits)}</Text>
            <Text style={[s.td, s.tnum]}>{r.share_of_activity}%</Text>
            <Text style={[s.td, s.tnum]}>{r.median_permit_valuation ? fmtMoneyFull(r.median_permit_valuation) : "—"}</Text>
            <Text style={[s.td, s.tdir, r.direction === "rising" && { color: colors.green }, r.direction === "unknown" && { color: colors.textMuted }]}>
              {r.direction === "rising" ? "▲" : r.direction === "falling" ? "▼" : r.direction === "unknown" ? "?" : "—"}
            </Text>
          </View>
        ))}
      </Card>
      {data.truncation_note ? <Text style={[type.spec, s.warn]}>{data.truncation_note}</Text> : null}
      <Text style={[type.spec, s.note]}>
        {data.jurisdiction} · {data.area?.window_days} {t("days")} · {t("live")} {data.source?.fetched_at?.slice(0, 10)} · {data.note}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- Stuck?
function StuckTab({ t, run, cache, setCache }) {
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState("");
  const [dom, setDom] = useState("");
  const [cuts, setCuts] = useState("0");
  const data = cache.stuck;

  const load = async () => {
    const p = numOrNull(price);
    if (!p) return;
    setBusy(true);
    const r = await listingDiagnostic(
      {
        list_price: p,
        square_feet: run.subject.square_feet,
        days_on_market: numOrNull(dom) ?? 0,
        price_cuts: Math.max(0, parseInt(cuts, 10) || 0),
      },
      run.comps.filter((c) => c.closed),
    ).catch(() => ({ ok: false }));
    setBusy(false);
    setCache((c) => ({ ...c, stuck: r }));
  };

  if (busy) return <Loading text={t("diagnosing")} />;
  if (!data) {
    return (
      <View>
        <Text style={type.body}>{t("stuckIntro")}</Text>
        <View style={{ marginTop: 12 }}>
          <Field label={t("askingPrice")} value={price} onChangeText={setPrice} placeholder="2200000" keyboardType="numeric" />
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Field label={t("daysOnMarket")} value={dom} onChangeText={setDom} placeholder="45" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t("priceCuts")} value={cuts} onChangeText={setCuts} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
          <PrimaryButton title={t("diagnose")} onPress={load} disabled={!numOrNull(price)} />
        </View>
      </View>
    );
  }
  if (!data.ok) {
    return (
      <View>
        <Text style={[type.bodyStrong, s.warn]}>{data.error || `${t("diagnosticFailed")} (${data.status})`}</Text>
        <GhostButton title={t("tryAgain")} onPress={() => setCache((c) => ({ ...c, stuck: null }))} />
      </View>
    );
  }
  const pos = data.market_position ?? {};
  const reasons = data.reasons ?? [];
  return (
    <View>
      <Card style={s.block}>
        <GroupLabel>{t("marketPosition")}</GroupLabel>
        {Object.entries(pos)
          .filter(([, v]) => v !== null && typeof v !== "object")
          .map(([k, v]) => (
            <View key={k} style={s.trow}>
              <Text style={[type.spec, { flex: 1 }]}>{k.replaceAll("_", " ")}</Text>
              <Text style={s.td}>
                {typeof v === "number" ? (Math.abs(v) < 5 && !Number.isInteger(v) ? `${(v * 100).toFixed(1)}%` : fmtInt(v)) : String(v)}
              </Text>
            </View>
          ))}
      </Card>
      {reasons.map((r) => (
        <Card key={r.rank} style={s.block}>
          <Text style={type.bodyStrong}>{r.rank}. {r.reason}</Text>
          {r.evidence ? <Text style={[type.spec, s.note]}>{r.evidence}</Text> : null}
          {r.fix ? <Text style={[type.body, s.note]}>{t("fixLabel")} {r.fix}</Text> : null}
          <View style={{ marginTop: 6 }}>
            <Pill
              text={r.curable_by_construction ? t("constructionCanFix") : `${t("routesTo")} ${String(r.routes_to ?? r.category ?? "").toUpperCase()}`}
              tone={r.curable_by_construction ? "green" : "amber"}
            />
          </View>
        </Card>
      ))}
      {data.verdict ? <Text style={[type.bodyStrong, s.block]}>{data.verdict}</Text> : null}
      {data.next_step ? <Text style={[type.spec, s.note]}>{data.next_step}</Text> : null}
      <GhostButton title={t("runAgain")} onPress={() => setCache((c) => ({ ...c, stuck: null }))} />
    </View>
  );
}

export default function ContextTabs({ t, run }) {
  const [tab, setTab] = useState(null); // collapsed until asked
  const [cache, setCache] = useState({});

  return (
    <View style={s.wrap}>
      <GroupLabel>{t("whyBand")}</GroupLabel>
      <View style={s.tabRow}>
        {TABS.map((tb) => (
          <Text
            key={tb.key}
            onPress={() => setTab(tab === tb.key ? null : tb.key)}
            style={[s.tab, tab === tb.key && s.tabOn]}
            accessibilityRole="button"
          >
            {t(tb.label)}
          </Text>
        ))}
      </View>
      {tab === "market" && <MarketTab t={t} run={run} cache={cache} setCache={setCache} />}
      {tab === "trends" && <TrendsTab t={t} run={run} cache={cache} setCache={setCache} />}
      {tab === "stuck" && <StuckTab t={t} run={run} cache={cache} setCache={setCache} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 12 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, textAlign: "center", paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.borderStrong,
    ...type.bodyStrong, color: colors.textSecondary, overflow: "hidden",
  },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink, color: colors.onInk },
  loading: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  block: { marginBottom: 10 },
  headline: { ...type.projectName, marginTop: 2 },
  subhead: { marginTop: 10, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  note: { marginTop: 6 },
  warn: { color: colors.amber, marginTop: 8 },
  listLabel: { marginTop: 6, marginBottom: 8 },
  compHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierTag: { ...type.projectCode, fontSize: 12 },
  trow: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  th: { ...type.microLabel },
  td: { ...type.rowAmount, fontSize: 12.5 },
  tnum: { width: 64, textAlign: "right" },
  tdir: { width: 28, textAlign: "center" },
  formRow: { flexDirection: "row", gap: 10 },
});
