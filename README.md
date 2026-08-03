# Keypoint ARV

Address in → **defensible ARV band out** — the standalone valuation app, a
thin face on the BOBAI ARV agent. The app computes nothing: engines decide,
this renders.

- Plan + user stories: `BOBAI/trunk/ARV_APP_PLAN.md` (stories AV-01…17)
- Backend contract: `BOBAI/trunk/ARV_APP_CONTRACT.md`
- Agent model: `BOBAI/agents/arv/README.md`

## The flow

```
Address ▸ Comp curation (closed?/renovated? flags) ▸ THE ANSWER
          user testimony, no client math           band P20/P50/P80
                                                   breakeven + red line
                                                   ARV per scope tier S1–S6
```

Locked render rules: never one number (band + breakeven + tiers, always);
confidence and comp-set notes verbatim; "NONE SOLD" screams; no MaxBid field
anywhere in this app (the moat — bid gap is breakeven distance only).

## Dev

```
npm install
npx expo start --web        # NEVER with CI=1 — it kills Metro hot reload
```

Expo SDK 57 / React Native 0.86 / react-native-web; hand-rolled screen stack
(no nav lib); Keypoint cream/ink/orange design system (`src/theme.js`, shared
with the Field app). Local-first: recents + curated comp sets in
AsyncStorage/localStorage (`keypoint-arv:v1`); no server table for app state.
