// Keep app.json as the default config; each signing bundle can supply its own
// registered Google iOS callback scheme without changing shared defaults.
module.exports = ({ config }) => ({
  ...config,
  plugins: (config.plugins || []).map((plugin) =>
    Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin'
      ? [plugin[0], { ...plugin[1], iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || plugin[1].iosUrlScheme }]
      : plugin,
  ),
});
