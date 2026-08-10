import { Stack } from "expo-router";
import { useEffect } from "react";

import { configureAudioMode } from "@/audio/audioMode";

export default function RootLayout() {
  useEffect(() => {
    configureAudioMode().catch(() => undefined);
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
