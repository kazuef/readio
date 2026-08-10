import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";
import type { UserFacingError } from "@/utils/errors";

export function ErrorPanel({
  error,
  onRetry,
  onEdit,
}: {
  error: UserFacingError;
  onRetry: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={styles.card} accessibilityLiveRegion="assertive">
      <View style={styles.icon}>
        <Ionicons
          name="cloud-offline-outline"
          size={29}
          color={colors.danger}
        />
      </View>
      <Text style={styles.kicker}>COULD NOT MAKE AUDIO</Text>
      <Text style={styles.title}>うまく音声にできませんでした</Text>
      <Text style={styles.message}>{error.message}</Text>
      {error.canRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={styles.primary}
        >
          <Ionicons name="refresh" size={18} color="white" />
          <Text style={styles.primaryText}>もう一度試す</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        style={styles.secondary}
      >
        <Ionicons name="create-outline" size={18} color={colors.ink} />
        <Text style={styles.secondaryText}>URLを修正する</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 28,
    padding: 26,
  },
  icon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#FFE4EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  kicker: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  title: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 7,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginVertical: 14,
  },
  primary: {
    width: "100%",
    minHeight: 56,
    marginTop: 6,
    borderRadius: 17,
    backgroundColor: colors.ink,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontSize: 14, fontWeight: "900" },
  secondary: {
    width: "100%",
    minHeight: 52,
    marginTop: 9,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
});
