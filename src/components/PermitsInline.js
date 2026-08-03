// Live permit record for one address (AV-10) — the evidence drill-down on a
// comp card or the subject. Fetched on first expand, never cached across
// sessions (the engine is live-by-design; fetched_at is the freshness stamp).
// An uncovered city renders the engine's honest answer, not an error.
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { permitHistory } from "../api";
import { parseAddress } from "../util";
import { colors, type } from "../theme";

export default function PermitsInline({ t, addressText, fallbackCity }) {
  const [state, setState] = useState("idle"); // idle | loading | done
  const [result, setResult] = useState(null);

  const load = async () => {
    if (state === "loading") return;
    const parsed = parseAddress(addressText);
    const line = parsed?.line ?? addressText;
    const city = parsed?.city ?? fallbackCity;
    if (!city) {
      setResult({ covered: false, city: "?", supported: [] });
      setState("done");
      return;
    }
    setState("loading");
    const r = await permitHistory(line, city).catch(() => ({ ok: false }));
    setResult(r);
    setState("done");
  };

  if (state === "idle") {
    return (
      <Pressable onPress={load} hitSlop={6}>
        <Text style={s.link}>{t("permitHistory")}</Text>
      </Pressable>
    );
  }
  if (state === "loading") {
    return (
      <View style={s.row}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[type.spec, { marginLeft: 8 }]}>{t("readingRecord")}</Text>
      </View>
    );
  }
  if (!result || result.ok === false) {
    // covered:false arrives as HTTP 200 (ok:true) — this branch is real failure.
    return <Text style={s.warn}>{t("permitFailed")}</Text>;
  }
  if (result.covered === false) {
    // `supported` rows are { jurisdiction, cities: [...] } — name the cities.
    const cities = (result.supported ?? [])
      .flatMap((sr) => (Array.isArray(sr?.cities) ? sr.cities.slice(0, 2) : [sr]))
      .filter((c) => typeof c === "string")
      .slice(0, 6);
    return (
      <Text style={type.spec}>
        {t("noFeedFor")} {result.city}{t("yetCovered")} {cities.join(", ") || "—"}…
      </Text>
    );
  }
  const permits = result.permits ?? [];
  return (
    <View>
      <Text style={s.meta}>
        {result.jurisdiction} · {t("livePublicRecord")} · {permits.length} {permits.length === 1 ? t("permitOne") : t("permitMany")}
      </Text>
      {permits.length === 0 && <Text style={type.spec}>{t("noPermitsOnFile")}</Text>}
      {permits.slice(0, 8).map((p, i) => (
        <View key={i} style={s.permitRow}>
          <Text style={s.permitDate}>{String(p.issued_date ?? "").slice(0, 10) || "—"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.spec} numberOfLines={1}>
              {p.type ?? "permit"}
              {p.status ? ` · ${p.status}` : ""}
              {p.valuation ? ` · $${Number(p.valuation).toLocaleString("en-US")}` : ""}
            </Text>
            {p.description ? (
              <Text style={[type.spec, { color: colors.textMuted }]} numberOfLines={2}>{p.description}</Text>
            ) : null}
          </View>
        </View>
      ))}
      {permits.length > 8 && <Text style={type.spec}>{t("andMore")} {permits.length - 8} {t("more")}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  link: { ...type.bodyStrong, color: colors.accent, fontSize: 13, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  warn: { ...type.spec, color: colors.amber },
  meta: { ...type.microLabel, marginBottom: 6 },
  permitRow: { flexDirection: "row", gap: 10, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  permitDate: { ...type.spec, width: 78 },
});
