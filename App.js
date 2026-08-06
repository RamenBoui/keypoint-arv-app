// Keypoint ARV — address in → defensible band out. A thin face on the BOBAI
// ARV agent: the app computes nothing, engines decide, this renders.
// Contract: BOBAI/trunk/ARV_APP_CONTRACT.md. Hand-rolled screen stack
// (address → comps → answer), same pattern as the Field app.
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { arvAgent } from "./src/api";
import { makeT } from "./src/i18n";
import { takeSharedRun } from "./src/share";
import { DEMO_RUNS, takePreviewScreen } from "./src/preview";
import { getLang, load, rememberRun, setLang } from "./src/store";
import { todayLocalISO } from "./src/util";
import { colors, ensureFontsWeb, type } from "./src/theme";
import AddressScreen from "./src/screens/AddressScreen";
import CompSetScreen from "./src/screens/CompSetScreen";
import CompareScreen from "./src/screens/CompareScreen";
import LiveBandBar from "./src/components/LiveBandBar";
import AnswerScreen from "./src/screens/AnswerScreen";

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("address"); // address | comps | answer | compare
  const [run, setRun] = useState(null); // { addressText, address, subject, comps, deal, enriched }
  const [result, setResult] = useState(null); // last arv-agent response
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lang, setLangState] = useState("en");
  const [previewError, setPreviewError] = useState(null);
  const scroller = useRef(null);
  const debounceRef = useRef(null);
  const t = makeT(lang);
  const liveReady = !!(run?.subject?.square_feet && run?.comps?.length);

  // Flow iteration 2 (2026-08-03): the band is a LIVE readout, not a
  // destination. While curating, any change to testimony/sizes re-runs the
  // engine after a 700ms lull — it is pure, free, and answers in ~190ms
  // (stress-tested), and the contract says "re-run liberally". The strip
  // renders the result; refusals land there verbatim.
  useEffect(() => {
    if (screen !== "comps" || !liveReady) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      const r = await arvAgent({
        subject: {
          square_feet: run.subject.square_feet,
          ...(run.subject.total_sf_after ? { total_sf_after: run.subject.total_sf_after } : {}),
        },
        comps: run.comps,
        deal: run.deal ?? undefined,
      }).catch(() => ({ ok: false, error: "network" }));
      setBusy(false);
      if (r.ok) {
        setResult(r);
        setPreviewError(null);
        rememberRun(run);
      } else {
        setPreviewError(r.error || `arv-agent failed (${r.status})`);
      }
    }, 700);
    return () => clearTimeout(debounceRef.current);
  }, [screen, run, liveReady]);

  // A screen change (or a fresh error banner) always starts at the top —
  // landing mid-scroll on the Answer, or erroring above the fold, reads as
  // "nothing happened".
  useEffect(() => {
    scroller.current?.scrollTo?.({ y: 0, animated: false });
  }, [screen, error]);

  useEffect(() => {
    ensureFontsWeb();
    load().then(() => {
      setLangState(getLang());
      setReady(true);
      // A shared link (#run=…) opens straight into its curated run — flags
      // included — landing on Curate so the receiver can inspect the
      // testimony before the band.
      const shared = takeSharedRun();
      if (shared) {
        setRun(shared);
        setScreen("comps");
        return;
      }
      // Preview deep-link (#screen=…): land on one screen with demo data so
      // a harness page can show the whole app at once. Demo runs are seeded
      // into recents so Compare has something to compare.
      const preview = takePreviewScreen();
      if (preview) {
        DEMO_RUNS.forEach((r) => rememberRun(r));
        if (preview === "compare") {
          setScreen("compare");
        } else if (preview === "comps") {
          setRun(DEMO_RUNS[0]);
          setScreen("comps");
        } else if (preview === "answer") {
          runArv(DEMO_RUNS[0]);
        }
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
        <View style={s.brandRow}>
          <Text style={type.brandLockup}>KEYPOINT · ARV</Text>
          <View style={s.crumbs}>
            {["address", "comps", "answer"].map((st) => (
              <View key={st} style={[s.crumb, screen === st && s.crumbOn]} />
            ))}
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={s.langRow}>
            {["en", "es"].map((l) => (
              <Pressable key={l} onPress={() => { setLangState(l); setLang(l); }} hitSlop={8}>
                <Text style={[s.langOpt, lang === l && s.langOptOn]}>{l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={type.date}>{todayLocalISO()}</Text>
        </View>
      </View>
      <ScrollView ref={scroller} style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
        {error ? <Text style={s.error}>{error}</Text> : null}
        {screen === "address" && (
          <AddressScreen
            t={t}
            onSubject={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onRestoreRun={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onCompare={() => setScreen("compare")}
          />
        )}
        {screen === "compare" && (
          <CompareScreen
            t={t}
            onOpenRun={(r) => { setRun(r); setResult(null); setScreen("comps"); }}
            onBack={() => setScreen("address")}
          />
        )}
        {screen === "comps" && run && (
          <CompSetScreen
            t={t}
            run={run}
            onChange={(next) => { setRun(next); }}
          />
        )}
        {screen === "answer" && run && result && (
          <AnswerScreen
            t={t}
            lang={lang}
            run={run}
            result={result}
            busy={busy}
            onRunDeal={(deal) => runArv({ ...run, deal })}
            onBack={() => setScreen("comps")}
            onNewAddress={() => { setRun(null); setResult(null); setScreen("address"); }}
          />
        )}
      </ScrollView>
      {screen === "comps" && run && (
        <LiveBandBar
          t={t}
          result={result}
          busy={busy}
          error={previewError}
          ready={liveReady}
          testimony={`${t("testimony")} ${run.comps.filter((c) => c.closed).length} ${t("sold")} · ${run.comps.filter((c) => c.renovated).length} ${t("renovatedLower")}, ${t("of")} ${run.comps.length}`}
          onOpen={() => { if (result?.ok) setScreen("answer"); }}
        />
      )}
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  crumbs: { flexDirection: "row", gap: 4 },
  crumb: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  crumbOn: { backgroundColor: colors.accent },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  langRow: { flexDirection: "row", gap: 6 },
  langOpt: { ...type.brandLockup, color: colors.textMuted },
  langOptOn: { color: colors.accent },
  body: { flex: 1 },
  bodyContent: { maxWidth: 560, width: "100%", alignSelf: "center", paddingBottom: 40 },
  error: {
    ...type.bodyStrong,
    color: colors.red,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
