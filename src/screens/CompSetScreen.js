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

function CompCard({ t, comp, fallbackCity, onToggle, onRemove }) {
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
        <FlagChip label={t("soldClosed")} on={comp.closed} onToggle={() => onToggle("closed")} />
        <FlagChip label={t("renovated")} on={comp.renovated} onToggle={() => onToggle("renovated")} />
      </View>
      {!!comp.address && (
        <View style={s.permits}>
          <PermitsInline t={t} addressText={comp.address} fallbackCity={fallbackCity} />
        </View>
      )}
    </Card>
  );
}

export default function CompSetScreen({ t, run, onChange, onRunArv, busy }) {
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
        {!enriched && <Pill text={t("manualEntryPill")} tone="amber" />}
        {subject.beds != null && (
          <Text style={type.spec}>
            {subject.beds} bd · {subject.baths} ba{subject.yearBuilt ? ` · ${t("builtLabel")} ${subject.yearBuilt}` : ""}
          </Text>
        )}
      </View>

      <Card style={s.subjectCard}>
        <View style={s.sizeRow}>
          <View style={{ flex: 1 }}>
            <Field
              label={t("subjectSf")}
              value={subjectSqft}
              onChangeText={(v) => { setSubjectSqft(v); }}
              placeholder="1800"
              keyboardType="numeric"
              onSubmitEditing={() => { if (ready && !busy) onRunArv(sqftValue, numOrNull(afterSqft)); }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t("sizeOnceBuilt")}
              value={afterSqft}
              onChangeText={setAfterSqft}
              placeholder={t("sizePlaceholder")}
              keyboardType="numeric"
            />
          </View>
        </View>
        <Text style={type.body}>{t("curateHint")}</Text>
        <View style={s.permits}>
          <PermitsInline t={t} addressText={run.addressText} fallbackCity={run.address?.city} />
        </View>
      </Card>

      <View style={s.listHead}>
        <GroupLabel style={{ marginBottom: 0 }}>{t("comparableSales")} · {String(comps.length)}</GroupLabel>
        {comps.length > 1 && (
          <Pressable
            onPress={() => {
              const allSold = comps.every((c) => c.closed);
              setComps(comps.map((c) => ({ ...c, closed: !allSold })));
            }}
            hitSlop={8}
          >
            <Text style={s.bulkLink}>{comps.every((c) => c.closed) ? t("clearSoldFlags") : t("markAllSold")}</Text>
          </Pressable>
        )}
      </View>
      {comps.map((c, i) => (
        <CompCard
          key={`${c.id}-${i}`}
          t={t}
          comp={c}
          fallbackCity={run.address?.city}
          onToggle={(flag) => setComps(comps.map((x, j) => (j === i ? { ...x, [flag]: !x[flag] } : x)))}
          onRemove={() => setComps(comps.filter((_, j) => j !== i))}
        />
      ))}

      {adding ? (
        <Card style={s.compCard}>
          <Field label={t("compAddress")} value={addr} onChangeText={setAddr} placeholder="412 Oak St" autoFocus />
          <Field label={t("salePrice")} value={price} onChangeText={setPrice} placeholder="950000" keyboardType="numeric" />
          <Field label={t("squareFeet")} value={sqft} onChangeText={setSqft} placeholder="1650" keyboardType="numeric" />
          <PrimaryButton title={t("addComp")} onPress={addComp} disabled={!numOrNull(price) || !numOrNull(sqft)} />
          <GhostButton title={t("cancel")} onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={s.addRow}>
          <Text style={s.addRowText}>{t("addCompByHand")}</Text>
        </Pressable>
      )}

      <Divider />
      <PrimaryButton
        title={busy ? t("runningModel") : t("getTheBand")}
        onPress={() => onRunArv(sqftValue, numOrNull(afterSqft))}
        disabled={!ready || busy}
        tone="accent"
      />
      <Text style={[type.spec, s.hint]}>
        {ready
          ? `${t("testimony")} ${comps.filter((c) => c.closed).length} ${t("sold")} · ${comps.filter((c) => c.renovated).length} ${t("renovatedLower")}, ${t("of")} ${comps.length}`
          : sqftValue ? t("needOneComp") : t("needSubjectSf")}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 14, flexWrap: "wrap" },
  subjectCard: { marginBottom: 18 },
  listLabel: { marginBottom: 8 },
  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  bulkLink: { ...type.bodyStrong, color: colors.accent, fontSize: 13 },
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
