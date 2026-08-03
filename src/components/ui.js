// Keypoint ARV — shared primitives, same system as the Field app (flat
// hairline cards, ledger typography, orange only for the one action /
// the unresolved / wayfinding).
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, touch, type } from "../theme";

export function GroupLabel({ children, style }) {
  return <Text style={[type.groupLabel, s.groupLabel, style]}>{children}</Text>;
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoFocus, onSubmitEditing }) {
  return (
    <View style={s.fieldWrap}>
      {label ? <GroupLabel>{label}</GroupLabel> : null}
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
      />
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, tone = "ink" }) {
  const bg = disabled ? colors.borderStrong : tone === "accent" ? colors.accent : colors.ink;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.primaryBtn, { backgroundColor: pressed && !disabled ? colors.inkPressed : bg }]}
    >
      <Text style={s.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, tone }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ghostBtn, pressed && { opacity: 0.6 }]}>
      <Text style={[s.ghostBtnText, tone === "accent" && { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

// Toggle chip for the two evidence flags (closed / renovated) — the heart of
// the curation step. Selected = ink fill (orange is reserved).
export function FlagChip({ label, on, onToggle }) {
  return (
    <Pressable
      onPress={onToggle}
      style={[s.chip, on ? s.chipOn : null]}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!on }}
    >
      <Text style={[s.chipText, on ? s.chipTextOn : null]}>{on ? "✓ " : ""}{label}</Text>
    </Pressable>
  );
}

// Confidence / evidence pill. tone: green | amber | red | ink
const PILL_TONES = {
  green: colors.green,
  amber: colors.amber,
  red: colors.red,
  ink: colors.ink,
};
export function Pill({ text, tone = "ink" }) {
  const c = PILL_TONES[tone] ?? colors.ink;
  return (
    <View style={[s.pill, { backgroundColor: `${c}18` }]}>
      <Text style={[s.pillText, { color: c }]}>{text}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  groupLabel: { marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
  },
  fieldWrap: { marginBottom: 12 },
  input: {
    minHeight: touch.field,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    ...type.fieldValue,
  },
  primaryBtn: {
    minHeight: touch.button,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryBtnText: { ...type.bodyStrong, color: colors.onInk, fontSize: 16 },
  ghostBtn: { minHeight: touch.buttonSecondary, alignItems: "center", justifyContent: "center" },
  ghostBtnText: { ...type.bodyStrong, color: colors.textSecondary },
  chip: {
    minHeight: touch.chip,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.bodyStrong, color: colors.textSecondary },
  chipTextOn: { color: colors.onInk },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillText: { ...type.microLabel },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
});
