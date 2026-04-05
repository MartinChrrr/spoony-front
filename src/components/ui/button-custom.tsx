import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
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
}: ButtonProps) {
  const containerClassName = variantClassNames[variant];
  const textClassName = variantTextClassNames[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
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
