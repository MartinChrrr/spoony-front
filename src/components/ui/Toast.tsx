import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  ReactElement,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

const AUTO_DISMISS_MS = 5000;

interface ToastContextValue {
  /** Show a transient confirmation message (auto-dismisses after 5s). */
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): ReactElement {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMessage(null));
  }, [opacity]);

  const show = useCallback(
    (text: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(text);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      timeoutRef.current = setTimeout(hide, AUTO_DISMISS_MS);
    },
    [opacity, hide],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null && (
        <Animated.View
          testID="toast"
          pointerEvents="none"
          style={[styles.container, { opacity }]}
        >
          <View style={styles.toast} accessible accessibilityRole="alert">
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const NOOP_TOAST: ToastContextValue = { show: () => {} };

/**
 * Returns the toast controller. A toast is purely presentational, so when no
 * provider is mounted (e.g. an isolated screen render in tests) this falls back
 * to a no-op instead of throwing.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: COLORS.BROWN_DARK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    maxWidth: '100%',
    elevation: 6,
    shadowColor: COLORS.BROWN_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  text: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
