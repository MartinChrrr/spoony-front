import { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';

import { suggestionEndpoints, SuggestionResponse } from '@/data/api/endpoints/suggestions';
import { taskLogEndpoints } from '@/data/api/endpoints/taskLogs';
import { Button } from '@/components/ui/button-custom';
import { COLORS } from '@/constants/colors';

export default function CheckinStep3() {
  const router = useRouter();
  const { t } = useTranslation();
  const { spoons } = useLocalSearchParams<{ spoons: string }>();

  const totalSpoons = parseInt(spoons ?? '0', 10);

  const { data: suggestions = [], isLoading, isError } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const response = await suggestionEndpoints.getAll();
      return response.data.data ?? [];
    },
  });

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (suggestions.length > 0) {
      setCheckedIds(
        new Set(
          suggestions
            .filter((s: SuggestionResponse) => !s.exceedsBudget)
            .map((s: SuggestionResponse) => s.userTaskId),
        ),
      );
    }
  }, [suggestions]);

  const toggleTask = (userTaskId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userTaskId)) {
        next.delete(userTaskId);
      } else {
        next.add(userTaskId);
      }
      return next;
    });
  };

  const totalUsed = useMemo(
    () =>
      suggestions
        .filter((s: SuggestionResponse) => checkedIds.has(s.userTaskId))
        .reduce((sum: number, s: SuggestionResponse) => sum + s.spoonCost, 0),
    [suggestions, checkedIds],
  );

  const { mutateAsync, isPending } = useMutation({
    mutationFn: taskLogEndpoints.create,
  });

  const handleLetsGo = async () => {
    try {
      await mutateAsync({ userTaskIds: [...checkedIds] });
      router.replace('/(tabs)');
    } catch {
      // Stay on screen — error is visible via isPending becoming false
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen title — required for screen-reader navigation landmarks */}
      <Text style={styles.screenTitle} accessibilityRole="header">
        {t('checkin.step3Title')}
      </Text>

      {/* Progress bar — live region on the Text so VoiceOver/TalkBack
          announces the updated value whenever totalUsed changes */}
      <View style={styles.progressBar}>
        <Text
          style={styles.progressText}
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('checkin.spoonsUsedLabel', { used: totalUsed, total: totalSpoons })}
        >
          {t('checkin.spoonsUsed', { used: totalUsed, total: totalSpoons })}
        </Text>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : isError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {t('common.error')}
        </Text>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(suggestion: SuggestionResponse) => suggestion.userTaskId}
          // Cells read checkedIds; without extraData they won't re-render on toggle.
          extraData={checkedIds}
          style={styles.list}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item: suggestion }: { item: SuggestionResponse }) => {
            const isChecked = checkedIds.has(suggestion.userTaskId);
            // Build a rich label so the checkbox conveys all info in one focus stop:
            // "Faire les courses — 3 spoons — exceeds budget" (or without the last part)
            const checkboxLabel = suggestion.exceedsBudget
              ? t('checkin.checkboxLabelExceeds', {
                  name: suggestion.name,
                  count: suggestion.spoonCost,
                })
              : t('checkin.checkboxLabel', {
                  name: suggestion.name,
                  count: suggestion.spoonCost,
                });
            return (
              <View
                testID={`task-item-${suggestion.userTaskId}`}
                style={[
                  styles.taskRow,
                  suggestion.exceedsBudget && styles.taskRowExceeds,
                ]}
                // importantForAccessibility="no-hide-descendants" is NOT set so
                // the checkbox (sole interactive child) keeps its own focus stop;
                // the decorative Text nodes are hidden from screen readers below.
              >
                <Pressable
                  testID={`task-checkbox-${suggestion.userTaskId}`}
                  onPress={() => toggleTask(suggestion.userTaskId)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={checkboxLabel}
                  style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                >
                  {isChecked && <View style={styles.checkmark} />}
                </Pressable>

                {/* importantForAccessibility="no" hides these decorative texts
                    because their content is already in the checkbox label above */}
                <View
                  style={styles.taskInfo}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <Text
                    style={[
                      styles.taskName,
                      suggestion.exceedsBudget && styles.taskNameExceeds,
                    ]}
                  >
                    {suggestion.name}
                  </Text>
                  <Text style={styles.spoonCost}>
                    {t('checkin.spoonCost', { count: suggestion.spoonCost })}
                  </Text>
                </View>

                {suggestion.exceedsBudget && (
                  // Badge is visual-only; semantic info is in checkboxLabel
                  <View
                    testID={`exceeds-budget-${suggestion.userTaskId}`}
                    style={styles.exceedsBadge}
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                  >
                    <Text style={styles.exceedsBadgeText}>
                      {t('checkin.exceedsBudget')}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Button
          testID="lets-go-button"
          label={t('checkin.letsGo')}
          onPress={handleLetsGo}
          loading={isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  progressBar: {
    padding: 16,
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BROWN_LIGHT,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingText: {
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) — contrast ≈ 4.6:1, passes WCAG AA
    color: COLORS.BROWN_DARK,
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: 32,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    minHeight: 72,
    gap: 12,
  },
  taskRowExceeds: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.BROWN_MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  checkboxChecked: {
    backgroundColor: COLORS.ORANGE,
    borderColor: COLORS.ORANGE,
  },
  checkmark: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.WHITE,
    borderRadius: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskNameExceeds: {
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) — contrast ≈ 7.2:1, passes WCAG AA
    // BROWN_MEDIUM (#8B7355) was only ≈ 4.0:1, marginal failure for 16px bold text
    color: COLORS.BROWN_DARK,
  },
  spoonCost: {
    fontSize: 13,
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) — contrast ≈ 4.6:1, passes WCAG AA
    color: COLORS.BROWN_DARK,
    marginTop: 2,
  },
  exceedsBadge: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  exceedsBadgeText: {
    fontSize: 11,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
  },
});
