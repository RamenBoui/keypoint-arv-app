// The curation step — the app's heart. Candidates carry no closed/renovated
// truth; the USER flags them (user testimony, the difference between
// postures). The app counts nothing and prices nothing: flags go to
// arv-agent, which owns the evidence hierarchy.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { numOrNull, fmtMoneyFull, fmtInt } from "../util";
import { Card, Divider, Field, FlagChip, GhostButton, GroupLabel, Pill, PrimaryButton } from "../components/ui";
import PermitsInline from "../components/PermitsInline";
import { colors, type } from "../theme";

function CompCard({ comp, fallbackCity, onToggle, onRemove }) {
  return (
    <Card style={s.compCard}>
      <View style={s.compHead}>
        <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={1}>
          {comp.address || comp.id}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={s.remove}>✕</Text>
        </Pressable>
      </View>
      <Text style={[type.spec, s.specLine]}>
        {fmtMoneyFull(comp.sale_price)} · {fmtInt(comp.square_feet)} SF
        {comp.date ? ` · ${String(comp.date).slice(0, 10)}` : ""}
        {comp.distanceMi != null ? ` · ${comp.distanceMi} mi` : ""}
      </Text>
      <View style={s.flagRow}>
        <FlagChip label="Sold (closed)" on={comp.closed} onToggle={() => onToggle("closed")} />
        <FlagChip label="Renovated" on={comp.renovated} onToggle={() => onToggle("renovated")} />
      </View>
      {!!comp.address && (
        <View style={s.permits}>
          <PermitsInline addressText={comp.address} fallbackCity={fallbackCity} />
        </View>
      )}
    </Card>
  );
}

export default function CompSetScreen({ run, onChange, onRunArv, busy }) {
  const { subject, comps, enriched } = run;
  const [adding, setAdding] = useState(false);
  const [addr, setAddr] = useState("");
  const [price, setPrice] = useState("");
  const [sqft, setSqft] = useState("");
  const [subjectSqft, setSubjectSqft] = useState(subject.square_feet ? String(subject.square_feet) : "");
  const [afterSqft, setAfterSqft] = useState(subject.total_sf_after ? String(subject.total_sf_after) : "");

  const setComps = (next) => onChange({ ...run, comps: next });

  const addComp = () => {
    const p = numOrNull(price);
    const sf = numOrNull(sqft);
    if (!p || !sf) return;
    setComps([
      ...comps,
      {
        id: addr.trim() || `manual #${comps.length + 1}`,
        address: addr.trim(),
        sale_price: p,
        square_feet: sf,
        closed: true, // hand-entered comps are usually known sales; still editable
        renovated: false,
        source: "manual",
      },
    ]);
    setAddr(""); setPrice(""); setSqft(""); setAdding(false);
  };

  const sqftValue = numOrNull(subjectSqft);
  const ready = sqftValue && comps.length > 0;

  return (
    <View style={s.wrap}>
      <Text style={type.screenTitle} numberOfLines={2}>{run.addressText}</Text>
      <View style={s.subjectRow}>
        {!enriched && <Pill text="ENRICHMENT UNAVAILABLE — MANUAL ENTRY" tone="amber" />}
        {subject.beds != null && (
          <Text style={type.spec}>
            {subject.beds} bd · {subject.baths} ba{subject.yearBuilt ? ` · built ${subject.yearBuilt}` : ""}
          </Text>
        )}
      </View>

      <Card style={s.subjectCard}>
        <View style={s.sizeRow}>
          <View style={{ flex: 1 }}>
            <Field
              label="Subject square feet"
              value={subjectSqft}
              onChangeText={(t) => { setSubjectSqft(t); }}
              placeholder="1800"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Size once built (opt.)"
              value={afterSqft}
              onChangeText={setAfterSqft}
              placeholder="adding SF?"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Text style={type.body}>
          Mark what you know about each comp. Sold + renovated is the evidence the
          band stands on — unflagged comps degrade confidence, and the agent says so.
        </Text>
        <View style={s.permits}>
          <PermitsInline addressText={run.addressText} fallbackCity={run.address?.city} />
        </View>
      </Card>

      <GroupLabel style={s.listLabel}>Comparable sales · {String(comps.length)}</GroupLabel>
      {comps.map((c, i) => (
        <CompCard
          key={`${c.id}-${i}`}
          comp={c}
          fallbackCity={run.address?.city}
          onToggle={(flag) => setComps(comps.map((x, j) => (j === i ? { ...x, [flag]: !x[flag] } : x)))}
          onRemove={() => setComps(comps.filter((_, j) => j !== i))}
        />
      ))}

      {adding ? (
        <Card style={s.compCard}>
          <Field label="Comp address" value={addr} onChangeText={setAddr} placeholder="412 Oak St" autoFocus />
          <Field label="Sale price" value={price} onChangeText={setPrice} placeholder="950000" keyboardType="numeric" />
          <Field label="Square feet" value={sqft} onChangeText={setSqft} placeholder="1650" keyboardType="numeric" />
          <PrimaryButton title="Add comp" onPress={addComp} disabled={!numOrNull(price) || !numOrNull(sqft)} />
          <GhostButton title="Cancel" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={s.addRow}>
          <Text style={s.addRowText}>+ Add a comp by hand</Text>
        </Pressable>
      )}

      <Divider />
      <PrimaryButton
        title={busy ? "Running the model…" : "Get the band"}
        onPress={() => onRunArv(sqftValue, numOrNull(afterSqft))}
        disabled={!ready || busy}
        tone="accent"
      />
      {!ready && (
        <Text style={[type.body, s.hint]}>
          {sqftValue ? "Add at least one comp." : "Subject square feet is required."}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 14, flexWrap: "wrap" },
  subjectCard: { marginBottom: 18 },
  listLabel: { marginBottom: 8 },
  compCard: { marginBottom: 10 },
  compHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  remove: { ...type.bodyStrong, color: colors.textMuted, fontSize: 16, padding: 4 },
  specLine: { marginTop: 2, marginBottom: 10 },
  flagRow: { flexDirection: "row", gap: 8 },
  addRow: { paddingVertical: 14, alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: 12 },
  addRowText: { ...type.bodyStrong, color: colors.accent },
  hint: { marginTop: 8, textAlign: "center" },
  sizeRow: { flexDirection: "row", gap: 10 },
  permits: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 },
});
