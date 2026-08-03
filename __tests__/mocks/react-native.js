// Minimal react-native stand-in. Platform.OS is "web" so share.js takes its
// URL path under test; the ARV store has no Platform branches to worry about.
module.exports = {
  Platform: { OS: "web", select: (o) => (o && (o.test ?? o.default)) },
};
