// Keypoint ARV — address in → defensible band out. A thin face on the BOBAI
// ARV agent: the app computes nothing, engines decide, this renders.
// Contract: BOBAI/trunk/ARV_APP_CONTRACT.md. Hand-rolled screen stack
// (address → comps → answer), same pattern as the Field app.
import { useEffect, useRef, useState } from "react";
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { arvAgent } from "./src/api";
import { takeSharedRun } from "./src/share";
import { load, rememberRun } from "./src/store";
import { colors, ensureFontsWeb, type } from "./src/theme";
import AddressScreen from "./src/screens/AddressScreen";
import CompSetScreen from "./src/screens/CompSetScreen";
import CompareScreen from "./src/screens/CompareScreen";
import AnswerScreen from "./src/screens/AnswerScreen";

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("address"); // address | comps | answer | compare
  const [run, setRun] = useState(null); // { addressText, address, subject, comps, deal, enriched }
  const [result, setResult] = useState(null); // last arv-agent response
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scroller = useRef(null);

  // A screen change (or a fresh error banner) always starts at the top —
  // landing mid-scroll on the Answer, or erroring above the fold, reads as
  // "nothing happened".
  useEffect(() => {
    scroller.current?.scrollTo?.({ y: 0, animated: false });
  }, [screen, error]);

  useEffect(() => {
    ensureFontsWeb();
    load().then(() => {
      setReady(true);
      // A shared link (#run=…) opens straight into its curated run — flags
      // included — landing on Curate so the receiver can inspect the
      // testimony before the band.
      const shared = takeSharedRun();
      if (shared) {
        setRun(shared);
        setScreen("comps");
      }
    });
  }, []);

  // One entry point for every valuation call, so a flag change, a deal edit,
  // and the first run all go through the same engine door.
  const runArv = async (nextRun) => {
    setBusy(true);
    setError(null);
    const r = await arvAgent({
      subject: {
        square_feet: nextRun.subject.square_feet,
        ...(nextRun.subject.total_sf_after ? { total_sf_after: nextRun.subject.total_sf_after } : {}),
      },
      comps: nextRun.comps,
      deal: nextRun.deal ?? undefined,
    }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error || `arv-agent failed (${r.status})`);
      return false;
    }
    setRun(nextRun);
    setResult(r);
    rememberRun(nextRun);
    setScreen("answer");
    return true;
  };

  if (!ready) return <View style={s.boot} />;

  return (
    <SafeAreaView style={s.app}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={s.header}>
        <Text style={type.brandLockup}>KEYPOINT · ARV</Text>
        <Text style={type.date}>{new Date().toISOString().slice(0, 10)}</Text>
      </View>
      <ScrollView ref={scroller} style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
        {error ? <Text style={s.error}>{error}</Text> : null}
        {screen === "address" && (
          <AddressScreen
            onSubject={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onRestoreRun={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onCompare={() => setScreen("compare")}
          />
        )}
        {screen === "compare" && (
          <CompareScreen
            onOpenRun={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onBack={() => setScreen("address")}
          />
        )}
        {screen === "comps" && run && (
          <CompSetScreen
            run={run}
            busy={busy}
            onChange={setRun}
            onRunArv={(sqft, afterSf) =>
              runArv({ ...run, subject: { ...run.subject, square_feet: sqft, total_sf_after: afterSf ?? null } })}
          />
        )}
        {screen === "answer" && run && result && (
          <AnswerScreen
            run={run}
            result={result}
            busy={busy}
            onRunDeal={(deal) => runArv({ ...run, deal })}
            onBack={() => setScreen("comps")}
            onNewAddress={() => { setRun(null); setResult(null); setScreen("address"); }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
    ...(Platform.OS === "android" ? { paddingTop: StatusBar.currentHeight } : {}),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  body: { flex: 1 },
  bodyContent: { maxWidth: 560, width: "100%", alignSelf: "center", paddingBottom: 40 },
  error: {
    ...type.bodyStrong,
    color: colors.red,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
