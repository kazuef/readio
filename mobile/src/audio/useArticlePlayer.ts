import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect } from "react";

import { accessKey, absoluteApiUrl } from "@/api/client";

export function useArticlePlayer(audioPath: string | null, title: string | null) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!audioPath) return;
    player.replace({ uri: absoluteApiUrl(audioPath), headers: { "X-MVP-Key": accessKey } });
    player.setActiveForLockScreen(
      true,
      { title: title ?? "記事", artist: "YOMIMIMI" },
      { showSeekBackward: false, showSeekForward: false }
    );
    return () => {
      player.pause();
      player.setActiveForLockScreen(false);
    };
  }, [audioPath, player, title]);

  useEffect(() => {
    if (status.didJustFinish) player.pause();
  }, [player, status.didJustFinish]);

  return {
    playing: status.playing,
    loading: !status.isLoaded,
    currentTime: status.currentTime,
    duration: status.duration,
    play: () => player.play(),
    pause: () => player.pause()
  };
}
