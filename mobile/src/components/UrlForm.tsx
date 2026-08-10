import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/theme";

type Props = {
  value: string;
  error?: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const UrlForm = forwardRef<TextInput, Props>(function UrlForm(
  { value, error, disabled, onChange, onSubmit },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>ARTICLE URL</Text>
      <Text style={styles.label}>聴きたい記事を貼り付け</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <Ionicons name="link-outline" size={20} color={colors.purple} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          placeholder="https://example.com/article"
          placeholderTextColor="#A69AB6"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          maxLength={2048}
          editable={!disabled}
          onSubmitEditing={onSubmit}
          accessibilityLabel="記事URL"
          style={styles.input}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Pressable
        onPress={onSubmit}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="音声を生成"
        style={({ pressed }) => [
          styles.button,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {disabled ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="sparkles" size={18} color="white" />
        )}
        <Text style={styles.buttonText}>
          {disabled ? "送信しています…" : "音声にする"}
        </Text>
        {!disabled ? (
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.noteRow}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
        <Text style={styles.note}>生成した音声は24時間後に削除されます</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    gap: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  label: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  inputWrap: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.ink, fontSize: 15, minHeight: 56 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  buttonText: { color: "white", fontSize: 15, fontWeight: "900" },
  arrow: {
    position: "absolute",
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.65 },
  pressed: { transform: [{ scale: 0.99 }] },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  note: { color: colors.muted, fontSize: 11 },
});
