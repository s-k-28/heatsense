const config = require('./app.json').expo;

// The Google SDK needs the reversed iOS OAuth client ID at native build time.
// Keep an unconfigured development build bootable while Firebase is being set up.
if (process.env.GOOGLE_IOS_URL_SCHEME) {
  config.plugins.push(['@react-native-google-signin/google-signin', {
    iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME,
  }]);
}

module.exports = config;
