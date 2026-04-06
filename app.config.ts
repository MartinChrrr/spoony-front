import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "Spoony",
  slug: "spoony",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#F7F0E8",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.spoony.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#F7F0E8",
    },
    package: "com.spoony.app",
  },
  scheme: "spoony",
  extra: {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8080',
    privacyPolicyUrl: 'https://spoony-app.com/privacy',
  },
});
