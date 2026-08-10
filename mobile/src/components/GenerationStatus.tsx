import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { ProcessingStage } from "@/api/types";
import { colors } from "@/theme";

const stages: { key: ProcessingStage; label: string; detail: string }[] = [
  { key: "queued", label: "受付完了", detail: "順番を待っています" },
  {
    key: "fetching",
    label: "記事を取得",
    detail: "公開ページを読み込んでいます",
  },
  {
    key: "extracting",
    label: "本文を整理",
    detail: "読み上げる部分を見つけています",
  },
  {
    key: "generating_audio",
    label: "音声を生成",
    detail: "自然な日本語音声に変換しています",
  },
];

export function GenerationStatus({
  stage,
  title,
}: {
  stage: ProcessingStage;
  title: string | null;
}) {
  const current = stages.findIndex((item) => item.key === stage);
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.top}>
        <View style={styles.pulse}>
          <ActivityIndicator color={colors.purple} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>MAKING YOUR AUDIO</Text>
          <Text style={styles.heading}>耳へ届ける準備中</Text>
        </View>
      </View>
      {title ? (
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      <View style={styles.steps}>
        {stages.map((item, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <View key={item.key} style={styles.step}>
              <View style={[styles.dot, (active || done) && styles.dotActive]}>
                {done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              {index < stages.length - 1 ? (
                <View style={[styles.line, done && styles.lineActive]} />
              ) : null}
              <View style={styles.stepCopy}>
                <Text style={[styles.stepLabel, active && styles.activeLabel]}>
                  {item.label}
                </Text>
                {active ? (
                  <Text style={styles.detail}>{item.detail}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.wait}>そのまま画面を閉じても、変換は続きます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  pulse: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  kicker: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  heading: { marginTop: 4, color: colors.ink, fontSize: 22, fontWeight: "900" },
  title: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 18 },
  steps: { marginTop: 24 },
  step: { minHeight: 58, flexDirection: "row", position: "relative" },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { borderColor: colors.purple, backgroundColor: colors.purple },
  check: { color: "white", fontSize: 11, fontWeight: "900" },
  line: {
    position: "absolute",
    left: 10,
    top: 22,
    width: 2,
    height: 36,
    backgroundColor: colors.line,
  },
  lineActive: { backgroundColor: colors.purple },
  stepCopy: { flex: 1, marginLeft: 13 },
  stepLabel: { color: "#A094AF", fontSize: 14, fontWeight: "700" },
  activeLabel: { color: colors.ink },
  detail: { color: colors.muted, fontSize: 11, marginTop: 4 },
  wait: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.background,
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
  },
});
