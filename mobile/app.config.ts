import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "YOMIMIMI",
  slug: "yomimimi",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "yomimimi",
  userInterfaceStyle: "light",
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "15.1" },
        android: { minSdkVersion: 29 }
      }
    ],
    [
      "expo-audio",
      {
        enableBackgroundPlayback: true,
        enableBackgroundRecording: false,
        recordAudioAndroid: false,
        microphonePermission: false
      }
    ]
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.yomimimi.mobile"
  },
  android: {
    package: "app.yomimimi.mobile",
    softwareKeyboardLayoutMode: "resize"
  },
  extra: {
    eas: {
      projectId: "05729d7f-5875-45eb-837f-b545bc2a8c9c"
    }
  },
  experiments: { typedRoutes: true }
};

export default config;
