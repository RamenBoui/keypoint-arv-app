// Tests cover the PURE modules only (util parsing/formatting, share-link
// encode/decode, the report HTML builder, the local store, i18n coverage).
// Same setup as the Field app: no jest-expo (react-native 0.86 pins an older
// jest-preset than jest-expo wants), babel config INLINE on purpose — a root
// babel.config.js would override Metro's implicit babel-preset-expo.
module.exports = {
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {
    "^.+\\.js$": ["babel-jest", { presets: [["@babel/preset-env", { targets: { node: "current" } }]] }],
  },
  moduleNameMapper: {
    "^react-native$": "<rootDir>/__tests__/mocks/react-native.js",
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
};
