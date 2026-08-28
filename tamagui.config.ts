// Tamagui spike (BOBAI/trunk/TAMAGUI_EXTRACTION.md §7-A / §8-3) — runtime-only,
// no babel/metro plugin. defaultConfig from @tamagui/config/v5 supplies the
// size/space/radius scales (§2); createThemes builds the Keypoint theme suite
// from anchor palettes (§3): cream→ink base (dark = the same anchors
// reversed), orange accent with the step-9 invariant — #d9734e is index 8
// (step 9, the SOLID brand step) in BOTH schemes, so a brand control looks
// identical in either mode while everything around it flips.
import { createTamagui } from 'tamagui'
import { createThemes, defaultConfig } from '@tamagui/config/v5'

// Accent ramp: the simple createThemes API spreads plain anchor arrays evenly
// across 12 steps, which would land #d9734e on step 12 — so the full 12-step
// ramp is precomputed (HSL interpolation over the three Keypoint orange
// anchors #fbe9df → #e08a5f → #d9734e) with #d9734e pinned at index 8 and
// steps 10–12 graded down for solid-hover / low-contrast / high-contrast text.
const accentRamp = [
  '#fbe9df', '#f6d1be', '#efb99d', '#e8a27e', '#e08a5f', '#de845b',
  '#dd7f56', '#db7952', '#d9734e', '#d35c31', '#8d4429', '#4c2719',
]

const themes = createThemes({
  base: {
    palette: {
      light: ['#faf6ee', '#f2ebdd', '#eee4d4', '#8a857c', '#5f5951', '#241f1b'],
      dark: ['#241f1b', '#5f5951', '#8a857c', '#eee4d4', '#f2ebdd', '#faf6ee'],
    },
    // Exact Keypoint hexes the generated ramp can't carry (white card fill,
    // alpha-ink hairlines, cream-on-ink) — kept so converted components match
    // src/theme.js pixel-for-pixel. Dark values are the spike's best guesses;
    // the app is light-only today.
    extra: {
      light: {
        card: '#ffffff',
        borderStrong: 'rgba(42,38,34,0.20)',
        onInk: '#faf6ee',
        ink: '#2a2622',
        inkPress: '#1f1c19',
        textMuted: '#7a736a',
      },
      dark: {
        card: '#2a2622',
        borderStrong: 'rgba(250,246,238,0.25)',
        onInk: '#faf6ee',
        ink: '#faf6ee',
        inkPress: '#f2ebdd',
        textMuted: '#a9a29a',
      },
    },
  },
  accent: {
    palette: { light: accentRamp, dark: accentRamp },
  },
})

export const config = createTamagui({
  ...defaultConfig,
  themes,
})

export type KeypointConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends KeypointConfig {}
}

export default config
