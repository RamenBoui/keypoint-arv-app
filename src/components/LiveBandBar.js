// The live band strip (flow iteration 2, 2026-08-03) — curation with a
// pulse. Pinned under the Curate scroll; shows the current P20·P50·P80 +
// confidence, re-fed by App's debounced auto-run every time testimony
// changes. The engine's refusals render here VERBATIM, where the thumb is.
// One tap → the full Answer. Never one number: always the triple.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fmtMoney } from "../util";
import { colors, type } from "../theme";

const CONF_COLOR = { high: colors.green, medium: colors.amber, low: colors.red };

export default function LiveBandBar({ t, result, busy, error, ready, testimony, onOpen }) {
  let body;
  if (!ready) {
    body = <Text style={s.prompt}>{t("liveBandPrompt")}</Text>;
  } else if (error) {
    body = <Text style={s.error} numberOfLines={2}>{error}</Text>;
  } else if (busy && !result) {
    body = (
      <View style={s.busyRow}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[type.spec, { marginLeft: 8 }]}>{t("runningModel")}</Text>
      </View>
    );
  } else if (result?.band) {
    const conf = result.comp_set?.confidence ?? "low";
    body = (
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t("seeFullAnswer")}>
        <View style={s.triple}>
          <Text style={s.side}>{fmtMoney(result.band.arv?.p20)}</Text>
          <Text style={s.mid}>{fmtMoney(result.band.arv?.p50)}</Text>
          <Text style={s.side}>{fmtMoney(result.band.arv?.p80)}</Text>
          {busy && <ActivityIndicator size="small" color={colors.accent} style={s.refresh} />}
        </View>
        <View style={s.metaRow}>
          <Text style={[s.conf, { color: CONF_COLOR[conf] ?? colors.red }]}>
            {t("confidence")} {String(conf).toUpperCase()}
          </Text>
          <Text style={s.open}>{t("seeFullAnswer")}</Text>
        </View>
      </Pressable>
    );
  } else {
    body = <Text style={s.prompt}>{testimony}</Text>;
  }
  return (
    <View style={s.bar}>
      {body}
      {result?.band && !error ? <Text style={s.testimony}>{testimony}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    borderTopWidth: 1.5,
    borderTopColor: colors.accent,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  prompt: { ...type.spec, textAlign: "center" },
  error: { ...type.bodyStrong, color: colors.red, fontSize: 13, textAlign: "center" },
  busyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  triple: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 18 },
  side: { ...type.moneyForm, fontSize: 16, color: colors.textSecondary },
  mid: { ...type.moneyForm, fontSize: 24, color: colors.text },
  refresh: { position: "absolute", right: 0, top: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 },
  conf: { ...type.microLabel },
  open: { ...type.bodyStrong, color: colors.accent, fontSize: 13 },
  testimony: { ...type.microLabel, textAlign: "center", marginTop: 6, color: colors.label },
});
