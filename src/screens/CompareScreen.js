// Compare two saved runs side by side (FL-07) — the Saturday-morning
// question is rarely "what is this worth", it's "which of these two". Bands
// come from fresh arv-agent calls (pure and fast); nothing is computed here.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { arvAgent } from "../api";
import { recents } from "../store";
import { fmtInt, fmtMoney, fmtPsf } from "../util";
import { Card, GhostButton, GroupLabel, Pill, PrimaryButton } from "../components/ui";
import { colors, type } from "../theme";

const CONF_TONE = { high: "green", medium: "amber", low: "red" };

function Column({ run, result }) {
  const band = result?.band;
  const conf = result?.comp_set?.confidence ?? "low";
  return (
    <View style={s.col}>
      <Text style={type.bodyStrong} numberOfLines={2}>{run.addressText}</Text>
      <Text style={type.spec}>{fmtInt(run.subject.square_feet)} SF · {run.comps.length} comps</Text>
      {!result ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : !result.ok ? (
        <Text style={[type.spec, { color: colors.amber, marginTop: 10 }]}>{result.error || "failed"}</Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={type.microLabel}>P50</Text>
          <Text style={s.p50}>{fmtMoney(band.arv?.p50)}</Text>
          <Text style={type.spec}>{fmtPsf(band.exit_psf?.p50)}</Text>
          <View style={s.row}><Text style={s.k}>P20</Text><Text style={s.v}>{fmtMoney(band.arv?.p20)}</Text></View>
          <View style={s.row}><Text style={s.k}>P80</Text><Text style={s.v}>{fmtMoney(band.arv?.p80)}</Text></View>
          {result.breakeven && (
            <View style={s.row}><Text style={s.k}>Breakeven</Text><Text style={s.v}>{fmtPsf(result.breakeven.breakeven_psf)}</Text></View>
          )}
          <View style={{ marginTop: 8 }}>
            <Pill text={`CONF: ${String(conf).toUpperCase()}`} tone={CONF_TONE[conf] ?? "red"} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function CompareScreen({ onOpenRun, onBack }) {
  const all = recents();
  const [picked, setPicked] = useState([]);
  const [results, setResults] = useState(null); // [r1, r2] once running

  const toggle = (i) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].slice(-2)));

  const run = async () => {
    const pair = picked.map((i) => all[i]);
    setResults([null, null]);
    pair.forEach(async (r, idx) => {
      const res = await arvAgent({
        subject: {
          square_feet: r.subject.square_feet,
          ...(r.subject.total_sf_after ? { total_sf_after: r.subject.total_sf_after } : {}),
        },
        comps: r.comps,
        deal: r.deal ?? undefined,
      }).catch(() => ({ ok: false, error: "network" }));
      setResults((prev) => {
        const next = [...(prev ?? [null, null])];
        next[idx] = res;
        return next;
      });
    });
  };

  useEffect(() => { setResults(null); }, [picked.length]);

  if (results) {
    const pair = picked.map((i) => all[i]);
    return (
      <View style={s.wrap}>
        <Text style={type.screenTitle}>Side by side</Text>
        <Card style={{ marginTop: 14 }}>
          <View style={s.cols}>
            <Column run={pair[0]} result={results[0]} />
            <View style={s.vr} />
            <Column run={pair[1]} result={results[1]} />
          </View>
        </Card>
        <Text style={[type.spec, s.note]}>
          Same engine, same rules — differences come from each run's own comp
          evidence, not from a ranking. Open either run to see its full answer.
        </Text>
        <GhostButton title={`Open ${pair[0].addressText.split(",")[0]}`} onPress={() => onOpenRun(pair[0])} />
        <GhostButton title={`Open ${pair[1].addressText.split(",")[0]}`} onPress={() => onOpenRun(pair[1])} />
        <GhostButton title="← Pick different runs" onPress={() => setResults(null)} />
        <GhostButton title="Done" tone="accent" onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={type.screenTitle}>Compare two</Text>
      <Text style={[type.body, { marginTop: 6 }]}>Pick two recent runs.</Text>
      <View style={{ marginTop: 12 }}>
        {all.map((r, i) => (
          <Pressable key={r.addressText} onPress={() => toggle(i)} style={[s.pickRow, picked.includes(i) && s.pickRowOn]}>
            <Text style={[type.bodyStrong, picked.includes(i) && { color: colors.onInk }]} numberOfLines={1}>
              {picked.includes(i) ? "✓ " : ""}{r.addressText}
            </Text>
            <Text style={[type.spec, picked.includes(i) && { color: colors.onInk }]}>
              {fmtInt(r.subject.square_feet)} SF · {r.comps.length} comps · {r.at.slice(0, 10)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 14 }}>
        <PrimaryButton title="Compare" onPress={run} disabled={picked.length !== 2} tone="accent" />
      </View>
      <GhostButton title="← Back" onPress={onBack} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  pickRow: {
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, backgroundColor: colors.card,
  },
  pickRowOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  vr: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  p50: { ...type.moneyForm, fontSize: 26 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  k: { ...type.spec },
  v: { ...type.rowAmount },
  note: { marginVertical: 10 },
});
