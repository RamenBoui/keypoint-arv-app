// Address in. Enrich fills subject facts + candidate comps; a blank/failed
// enrichment falls back to manual entry — the band must still render.
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { enrich } from "../api";
import { recents } from "../store";
import { parseAddress } from "../util";
import { Card, Field, GroupLabel, PrimaryButton } from "../components/ui";
import { colors, type } from "../theme";

export default function AddressScreen({ onSubject, onRestoreRun }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const recent = recents();

  const go = async () => {
    const address = parseAddress(text);
    if (!address) {
      setError("Enter the address as: street, city — e.g. 1257 Inspiration Point, West Covina, CA");
      return;
    }
    setError(null);
    setBusy(true);
    const r = await enrich(address).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) {
      onSubject({
        addressText: r.resolvedAddress || text.trim(),
        address,
        subject: { square_feet: r.sqft, beds: r.beds, baths: r.baths, yearBuilt: r.yearBuilt, asIsAvm: r.asIsAvm },
        comps: r.candidates,
        enriched: true,
      });
    } else {
      // manual path — subject sqft + comps entered by hand on the next screen
      onSubject({
        addressText: text.trim(),
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
          onChangeText={setText}
          placeholder="1257 Inspiration Point, West Covina, CA"
          autoFocus
          onSubmitEditing={go}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        {busy ? (
          <View style={s.busyRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[type.body, { marginLeft: 10 }]}>Pulling facts and candidate comps…</Text>
          </View>
        ) : (
          <PrimaryButton title="Find comps" onPress={go} disabled={!text.trim()} />
        )}
      </Card>

      {recent.length > 0 && (
        <View style={s.recents}>
          <GroupLabel>Recent</GroupLabel>
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
  error: { ...type.body, color: colors.red, marginBottom: 10 },
  busyRow: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  recents: { marginTop: 4 },
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
