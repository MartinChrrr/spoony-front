import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  testID?: string;
  /** Override the accessibility label when the visible label lacks context (e.g. "Postpone" → "Postpone Faire les courses"). Falls back to `label`. */
  accessibilityLabel?: string;
  /** Optional hint read after the label by screen readers. */
  accessibilityHint?: string;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-orange",
  secondary: "bg-brown-light",
};

const variantTextClassNames: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-brown-dark",
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  testID,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const containerClassName = variantClassNames[variant];
  const textClassName = variantTextClassNames[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      className={containerClassName}
      style={styles.button}
    >
      {loading ? (
        <ActivityIndicator testID="button-loading-indicator" />
      ) : (
        <Text className={textClassName}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
