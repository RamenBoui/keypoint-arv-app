// Address in. Enrich fills subject facts + candidate comps; a blank/failed
// enrichment falls back to manual entry — the band must still render.
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { enrich } from "../api";
import { recents } from "../store";
import { suggestAddresses } from "../suggest";
import { parseAddress } from "../util";
import { Card, Field, GroupLabel, PrimaryButton } from "../components/ui";
import { colors, type } from "../theme";

export default function AddressScreen({ onSubject, onRestoreRun, onCompare }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const debounce = useRef(null);
  const recent = recents();

  // Autocomplete (X-03): debounced, fail-silent, abortable — sugar over the
  // text field, never a gate. A picked suggestion carries a clean address
  // OBJECT, so parsing is skipped entirely for that path.
  const onChangeText = (t) => {
    setText(t);
    clearTimeout(debounce.current);
    if (t.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      const rows = await suggestAddresses(t);
      setSuggestions(rows);
    }, 300);
  };

  const go = async (addressOverride, labelOverride) => {
    const address = addressOverride ?? parseAddress(text);
    if (!address) {
      setError("Enter the address as: street, city — e.g. 1257 Inspiration Point, West Covina, CA");
      return;
    }
    setError(null);
    setSuggestions([]);
    setBusy(true);
    if (labelOverride) setText(labelOverride);
    const r = await enrich(address).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) {
      onSubject({
        addressText: r.resolvedAddress || labelOverride || text.trim(),
        address,
        subject: {
          square_feet: r.sqft, beds: r.beds, baths: r.baths, yearBuilt: r.yearBuilt,
          asIsAvm: r.asIsAvm, marketRent: r.marketRent,
        },
        comps: r.candidates,
        enriched: true,
      });
    } else {
      // manual path — subject sqft + comps entered by hand on the next screen
      onSubject({
        addressText: labelOverride || text.trim(),
        address,
        subject: { square_feet: null },
        comps: [],
        enriched: false,
      });
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={type.screenTitle}>What will it be worth?</Text>
      <Text style={[type.body, s.sub]}>
        Address in — defensible band out. Every number traces to its evidence.
      </Text>

      <Card style={s.card}>
        <Field
          label="Property address"
          value={text}
          onChangeText={onChangeText}
          placeholder="1257 Inspiration Point, West Covina, CA"
          autoFocus
          onSubmitEditing={() => go()}
        />
        {suggestions.length > 0 && !busy && (
          <View style={s.suggestBox}>
            {suggestions.map((sug) => (
              <Pressable
                key={sug.label}
                onPress={() => go(sug.address, sug.label)}
                style={({ pressed }) => [s.suggestRow, pressed && { backgroundColor: colors.surfaceSunken }]}
              >
                <Text style={type.bodyStrong} numberOfLines={1}>{sug.label}</Text>
              </Pressable>
            ))}
            <Text style={s.suggestCredit}>suggestions © OpenStreetMap</Text>
          </View>
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
        {busy ? (
          <View style={s.busyRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[type.body, { marginLeft: 10 }]}>Pulling facts and candidate comps…</Text>
          </View>
        ) : (
          <PrimaryButton title="Find comps" onPress={() => go()} disabled={!text.trim()} />
        )}
      </Card>

      {recent.length > 0 && (
        <View style={s.recents}>
          <View style={s.recentHead}>
            <GroupLabel style={{ marginBottom: 0 }}>Recent</GroupLabel>
            {recent.length >= 2 && (
              <Pressable onPress={onCompare} hitSlop={8}>
                <Text style={s.compareLink}>Compare two ▸</Text>
              </Pressable>
            )}
          </View>
          {recent.map((r) => (
            <Pressable key={r.addressText} onPress={() => onRestoreRun(r)} style={({ pressed }) => [s.recentRow, pressed && { opacity: 0.6 }]}>
              <Text style={type.bodyStrong} numberOfLines={1}>{r.addressText}</Text>
              <Text style={type.date}>{r.at.slice(0, 10)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  sub: { marginTop: 6, marginBottom: 16 },
  card: { marginBottom: 20 },
  suggestBox: { marginTop: -4, marginBottom: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden", backgroundColor: colors.card },
  suggestRow: { paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  suggestCredit: { ...type.microLabel, textAlign: "right", padding: 6, color: colors.placeholder },
  error: { ...type.body, color: colors.red, marginBottom: 10 },
  busyRow: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  recents: { marginTop: 4 },
  recentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  compareLink: { ...type.bodyStrong, color: colors.accent, fontSize: 13 },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
