import { useEffect, useRef } from 'react';
import { View, Text, Animated, AccessibilityInfo, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/colors';

interface SpoonGaugeProps {
  spoons: number;
  spoonsUsed: number;
}

export default function SpoonGauge({ spoons, spoonsUsed }: SpoonGaugeProps) {
  const { t } = useTranslation();
  const fraction = spoons > 0 ? Math.min(1, spoonsUsed / spoons) : 0;

  const animatedScale = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        animatedScale.setValue(fraction);
      } else {
        Animated.timing(animatedScale, {
          toValue: fraction,
          duration: 400,
          // Animate transform (GPU/UI thread) instead of width (layout each frame).
          useNativeDriver: true,
        }).start();
      }
    });
  }, [fraction, animatedScale]);

  const animatedStyle = {
    transform: [{ scaleX: animatedScale }],
  };

  return (
    <View style={styles.container}>
      {/* Visible count — decorative duplicate of the progressbar value.
          Screen readers use the progressbar's accessibilityLabel/Value instead. */}
      <Text
        style={styles.countText}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {spoonsUsed} / {spoons}
      </Text>

      {/* Progressbar: announces "X of Y spoons used" to VoiceOver/TalkBack */}
      <View
        style={styles.gaugeTrack}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('checkin.spoonsUsedLabel', { used: spoonsUsed, total: spoons })}
        accessibilityValue={{ min: 0, max: spoons, now: spoonsUsed }}
      >
        <Animated.View
          testID="gauge-fill"
          style={[styles.gaugeFill, animatedStyle]}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>

      {/* Individual spoon dots are purely decorative — the progressbar above
          already conveys the same information.
          Plain View elements with no text, no accessibilityRole, and
          accessible={false} are skipped by both VoiceOver (iOS) and
          TalkBack (Android) automatically. No importantForAccessibility
          wrapper is used here to preserve RNTL testID queryability. */}
      {spoons <= 10 && (
        <View style={styles.spoonsRow}>
          {Array.from({ length: spoons }, (_, i) => (
            <View
              key={i}
              testID={i < spoonsUsed ? 'spoon-icon-used' : 'spoon-icon-available'}
              style={i < spoonsUsed ? styles.spoonUsed : styles.spoonAvailable}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
    textAlign: 'center',
  },
  gaugeTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.BROWN_LIGHT,
    overflow: 'hidden',
  },
  gaugeFill: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.ORANGE,
    // Grow from the left edge as scaleX animates 0 → 1.
    transformOrigin: 'left',
  },
  spoonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  spoonUsed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.ORANGE,
  },
  spoonAvailable: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.BROWN_LIGHT,
  },
});
