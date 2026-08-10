import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useArticlePlayer } from "@/audio/useArticlePlayer";
import { colors } from "@/theme";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function PlayerPanel({
  audioUrl,
  title,
  sourceUrl,
  durationSeconds,
  onOpenSource,
  onNewArticle,
}: {
  audioUrl: string;
  title: string;
  sourceUrl: string;
  durationSeconds: number | null;
  onOpenSource: () => void;
  onNewArticle: () => void;
}) {
  const player = useArticlePlayer(audioUrl, title);
  const duration = player.duration || durationSeconds || 0;
  const progress =
    duration > 0 ? Math.min(player.currentTime / duration, 1) : 0;
  let host = "元の記事";
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {}

  return (
    <View style={styles.shell}>
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.now}>NOW PLAYING</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>READY</Text>
          </View>
        </View>
        <View style={styles.cover} accessibilityElementsHidden>
          <View style={styles.wave}>
            {[24, 42, 68, 84, 56, 76, 48, 64, 30].map((height, index) => (
              <View key={index} style={[styles.bar, { height }]} />
            ))}
          </View>
        </View>
        <Text style={styles.category}>ARTICLE AUDIO</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Pressable
          onPress={onOpenSource}
          accessibilityRole="link"
          style={styles.sourceRow}
        >
          <Text style={styles.source} numberOfLines={1}>
            {host} の記事
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.muted} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progress, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(player.currentTime)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={player.playing ? player.pause : player.play}
            disabled={player.loading}
            accessibilityRole="button"
            accessibilityLabel={player.playing ? "一時停止" : "再生"}
            style={({ pressed }) => [
              styles.play,
              pressed && styles.pressed,
              player.loading && styles.loading,
            ]}
          >
            <Ionicons
              name={player.playing ? "pause" : "play"}
              size={32}
              color="white"
              style={!player.playing ? { marginLeft: 4 } : undefined}
            />
          </Pressable>
        </View>
        <View style={styles.backgroundBadge}>
          <Ionicons name="moon-outline" size={15} color={colors.ink} />
          <Text style={styles.backgroundText}>画面を閉じても再生できます</Text>
        </View>
      </View>
      <Pressable
        onPress={onNewArticle}
        accessibilityRole="button"
        style={styles.newButton}
      >
        <Ionicons name="add" size={20} color={colors.ink} />
        <Text style={styles.newText}>別の記事を音声にする</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: "relative", paddingTop: 16 },
  blobOne: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.pink,
    right: -18,
    top: -2,
  },
  blobTwo: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.mint,
    left: -8,
    bottom: 65,
  },
  card: {
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 30,
    padding: 24,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  now: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  live: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  liveText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  cover: {
    height: 180,
    marginVertical: 20,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wave: { height: 90, flexDirection: "row", alignItems: "center", gap: 6 },
  bar: { width: 6, borderRadius: 4, backgroundColor: colors.mint },
  category: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  source: { color: colors.muted, fontSize: 12, maxWidth: "90%" },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.pale,
    marginTop: 22,
    overflow: "hidden",
  },
  progress: { height: 5, backgroundColor: colors.purple },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  time: { color: colors.muted, fontSize: 10, fontVariant: ["tabular-nums"] },
  controls: { alignItems: "center", marginTop: 10 },
  play: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.96 }] },
  loading: { opacity: 0.55 },
  backgroundBadge: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 20,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: colors.mint,
  },
  backgroundText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  newButton: {
    zIndex: 1,
    minHeight: 54,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  newText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
});
