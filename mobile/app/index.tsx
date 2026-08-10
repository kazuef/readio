import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useReducer, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createJob } from "@/api/jobs";
import { ErrorPanel } from "@/components/ErrorPanel";
import { GenerationStatus } from "@/components/GenerationStatus";
import { PlayerPanel } from "@/components/PlayerPanel";
import { UrlForm } from "@/components/UrlForm";
import { useGenerationJob } from "@/hooks/useGenerationJob";
import { initialState } from "@/state/appState";
import { reducer } from "@/state/reducer";
import { colors } from "@/theme";
import { toUserFacingError } from "@/utils/errors";
import { validateArticleUrl } from "@/utils/url";

export default function HomeScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useGenerationJob(state.jobId, state.phase === "processing", {
    onUpdate: (job) => dispatch({ type: "JOB_UPDATED", job }),
    onFailure: (error) => dispatch({ type: "FAILED", error }),
  });

  const submit = async () => {
    const result = validateArticleUrl(state.inputUrl);
    if (!result.valid) {
      setInputError(result.message);
      inputRef.current?.focus();
      return;
    }
    setInputError(null);
    Keyboard.dismiss();
    dispatch({ type: "SUBMIT", url: result.value });
    try {
      const job = await createJob(result.value);
      dispatch({ type: "ACCEPTED", jobId: job.id });
    } catch (error) {
      dispatch({ type: "FAILED", error: toUserFacingError(error) });
    }
  };

  const retry = () => void submit();
  const edit = () => {
    dispatch({ type: "EDIT" });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.decorTop} />
      <View style={styles.decorDot} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandGlyph}>◖</Text>
            </View>
            <Text style={styles.brand}>YOMIMIMI</Text>
            <View style={styles.beta}>
              <View style={styles.betaDot} />
              <Text style={styles.betaText}>PRIVATE BETA</Text>
            </View>
          </View>

          {state.phase === "idle" || state.phase === "submitting" ? (
            <>
              <View style={styles.hero}>
                <View style={styles.kicker}>
                  <View style={styles.kickerDot} />
                  <Text style={styles.kickerText}>ARTICLE AUDIO PLAYER</Text>
                </View>
                <Text style={styles.heroTitle}>
                  記事を、{"\n"}
                  <Text style={styles.heroAccent}>耳で読む。</Text>
                </Text>
                <Text style={styles.heroCopy}>
                  読みたかった記事を、あなただけの音声番組に。目と手を休めて、ことばの続きを聴こう。
                </Text>
                <View style={styles.benefits}>
                  {["日本語記事", "画面ロック再生", "登録不要"].map((label) => (
                    <View key={label} style={styles.benefit}>
                      <View style={styles.checkCircle}>
                        <Text style={styles.check}>✓</Text>
                      </View>
                      <Text style={styles.benefitText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <UrlForm
                ref={inputRef}
                value={state.inputUrl}
                error={inputError}
                disabled={state.phase === "submitting"}
                onChange={(value) => {
                  setInputError(null);
                  dispatch({ type: "INPUT_CHANGED", value });
                }}
                onSubmit={() => void submit()}
              />
            </>
          ) : null}

          {state.phase === "processing" && state.stage ? (
            <>
              <View style={styles.compactHero}>
                <Text style={styles.compactKicker}>PASTE. WAIT. LISTEN.</Text>
                <Text style={styles.compactTitle}>もうすぐ、耳へ。</Text>
              </View>
              <GenerationStatus stage={state.stage} title={state.title} />
            </>
          ) : null}

          {state.phase === "ready" && state.audioUrl && state.sourceUrl ? (
            <>
              <View style={styles.compactHero}>
                <Text style={styles.compactKicker}>YOUR ARTICLE IS READY</Text>
                <Text style={styles.compactTitle}>
                  ことばの続きを、どうぞ。
                </Text>
              </View>
              <PlayerPanel
                audioUrl={state.audioUrl}
                title={state.title ?? "記事"}
                sourceUrl={state.sourceUrl}
                durationSeconds={state.durationSeconds}
                onOpenSource={() => void Linking.openURL(state.sourceUrl!)}
                onNewArticle={() => dispatch({ type: "NEW_URL" })}
              />
            </>
          ) : null}

          {state.phase === "failed" && state.error ? (
            <>
              <View style={styles.compactHero}>
                <Text style={styles.compactKicker}>TRY ONCE MORE</Text>
                <Text style={styles.compactTitle}>別の道を試しましょう。</Text>
              </View>
              <ErrorPanel error={state.error} onRetry={retry} onEdit={edit} />
            </>
          ) : null}

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.muted}
            />
            <Text style={styles.footerText}>
              公開記事を私的に聴くための、小さなプレイヤーです。
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoiding: { flex: 1 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  decorTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.lavender,
    right: -150,
    top: -110,
    opacity: 0.62,
  },
  decorDot: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.pink,
    left: 26,
    top: 128,
  },
  header: { height: 66, flexDirection: "row", alignItems: "center" },
  brandMark: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  brandGlyph: {
    color: colors.purple,
    fontSize: 27,
    fontWeight: "900",
    marginTop: -3,
  },
  brand: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  beta: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  betaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.purple,
  },
  betaText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  hero: { paddingTop: Platform.OS === "ios" ? 28 : 20, paddingBottom: 30 },
  kicker: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: colors.lavender,
  },
  kickerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  kickerText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 50,
    lineHeight: 54,
    fontWeight: "900",
    letterSpacing: -3.2,
    marginTop: 21,
  },
  heroAccent: { color: colors.purple },
  heroCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 26,
    marginTop: 17,
    maxWidth: 430,
  },
  benefits: { flexDirection: "row", flexWrap: "wrap", gap: 13, marginTop: 21 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  benefitText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  compactHero: { paddingTop: 34, paddingBottom: 24 },
  compactKicker: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  compactTitle: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1.7,
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 28,
  },
  footerText: { color: colors.muted, fontSize: 10, textAlign: "center" },
});
