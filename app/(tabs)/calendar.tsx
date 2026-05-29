import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { taskLogRepository } from '@/data/repositories/taskLogRepository';
import { energyRepository } from '@/data/repositories/energyRepository';
import { COLORS } from '@/constants/colors';
import type { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
import type { EnergyResponse } from '@/data/api/endpoints/energy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: taskLogs = [] } = useQuery<TaskLogResponse[]>({
    queryKey: ['task-logs'],
    queryFn: () => taskLogRepository.getAll(),
  });

  const { data: energy } = useQuery<EnergyResponse | null>({
    queryKey: ['energy', 'today'],
    queryFn: () => energyRepository.getToday(),
  });

  // Map date string -> list of logs for that date
  const logsByDate = useMemo<Record<string, TaskLogResponse[]>>(() => {
    const map: Record<string, TaskLogResponse[]> = {};
    taskLogs.forEach((log) => {
      if (map[log.date] === undefined) {
        map[log.date] = [];
      }
      map[log.date].push(log);
    });
    return map;
  }, [taskLogs]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // First day of month weekday offset, Monday-first (0=Mon … 6=Sun)
  const firstDayOffset = useMemo(
    () => (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7,
    [viewYear, viewMonth],
  );

  // Weekday header labels (Monday-first), e.g. ["L","M","M","J","V","S","D"].
  // Defensive: returnObjects yields the raw key string if the resource is absent.
  const rawWeekdays = t('calendar.weekdays', { returnObjects: true });
  const rawWeekdayLabels = t('calendar.weekdayLabels', { returnObjects: true });
  const weekdays = Array.isArray(rawWeekdays) ? (rawWeekdays as string[]) : [];
  const weekdayLabels = Array.isArray(rawWeekdayLabels) ? (rawWeekdayLabels as string[]) : [];

  const selectedLogs = selectedDate !== null ? (logsByDate[selectedDate] ?? []) : [];
  const completedCount = selectedLogs.filter((l) => l.status === 'COMPLETED').length;
  const plannedCount = selectedLogs.filter((l) => l.status !== 'COMPLETED').length;

  const todayStr = toDateString(today);
  const isSelectedToday = selectedDate === todayStr;
  const spoonsUsed = isSelectedToday ? (energy?.spoonsUsed ?? 0) : 0;
  const spoonsTotal = isSelectedToday ? (energy?.spoons ?? 0) : 0;
  const spoonRatio = spoonsTotal > 0 ? Math.min(spoonsUsed / spoonsTotal, 1) : 0;

  function goToPrevMonth(): void {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth(): void {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Month header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.monthNav} testID="calendar-month-header">
        <Pressable
          onPress={goToPrevMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.prevMonth')}
          hitSlop={8}
        >
          <Text style={styles.navButtonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthLabel} accessibilityRole="header">
          {getMonthLabel(new Date(viewYear, viewMonth))}
        </Text>
        <Pressable
          onPress={goToNextMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
          hitSlop={8}
        >
          <Text style={styles.navButtonText}>{'>'}</Text>
        </Pressable>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Calendar grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      {/* Weekday header row (Monday-first), aligned with the grid columns */}
      <View style={styles.grid} testID="calendar-weekday-header">
        {weekdays.map((label, i) => (
          <View
            key={`weekday-${i}`}
            style={styles.weekdayCell}
            accessibilityRole="text"
            accessibilityLabel={weekdayLabels[i] ?? label}
          >
            <Text style={styles.weekdayText} importantForAccessibility="no">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {/* Transparent spacers for the first-day offset (no white empty cells) */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.emptyCell} />
        ))}

        {daysInMonth.map((day) => {
          const dateStr = toDateString(day);
          const logsForDay = logsByDate[dateStr] ?? [];
          const hasDot = logsForDay.length > 0;
          const isSelected = selectedDate === dateStr;

          return (
            <Pressable
              key={dateStr}
              testID={`calendar-day-${dateStr}`}
              onPress={() => setSelectedDate(dateStr)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              accessibilityRole="button"
              accessibilityLabel={
                hasDot
                  ? t('calendar.dayWithActivity', { date: dateStr, count: logsForDay.length })
                  : dateStr
              }
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {day.getDate()}
              </Text>
              {hasDot && (
                <View
                  testID="calendar-day-dot"
                  style={styles.dot}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Day summary card                                                     */}
      {/* ------------------------------------------------------------------ */}
      {selectedDate !== null && (
        <View testID="day-summary-card" style={styles.summaryCard}>
          <Text style={styles.summaryDate} accessibilityRole="header">
            {selectedDate}
          </Text>

          <Text style={styles.summaryText}>
            {t('calendar.tasksCount', { count: selectedLogs.length })}
          </Text>
          <Text style={styles.summaryText}>
            {t('calendar.completed')}: {completedCount}
          </Text>
          <Text style={styles.summaryText}>
            {t('calendar.planned')}: {plannedCount}
          </Text>

          <Text style={styles.summaryText}>
            {t('calendar.spoonsUsed', {
              used: spoonsUsed,
              total: spoonsTotal,
            })}
          </Text>

          {/* Spoon distribution bar */}
          <View
            testID="spoon-distribution-bar"
            style={styles.distributionBarContainer}
            accessibilityRole="progressbar"
            accessibilityLabel={t('calendar.spoonDistribution')}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(spoonRatio * 100) }}
          >
            <View
              style={[
                styles.distributionBarFill,
                { width: `${Math.round(spoonRatio * 100)}%` as `${number}%` },
              ]}
            />
          </View>

          <Pressable
            testID="day-detail-link"
            onPress={() => router.push(`/calendar/${selectedDate}`)}
            style={styles.detailLink}
            accessibilityRole="link"
            accessibilityLabel={t('calendar.viewDetail')}
            accessibilityHint={t('calendar.viewDetailHint')}
          >
            <Text style={styles.detailLinkText}>{t('calendar.viewDetail')} →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  content: {
    padding: 16,
    gap: 16,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 20,
    color: COLORS.BROWN_DARK,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    textTransform: 'capitalize',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
  },
  // Offset spacer: same footprint as a day cell but invisible (no white box)
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: 'transparent',
  },
  // Weekday header
  weekdayCell: {
    width: CELL_SIZE,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.BROWN_MEDIUM,
  },
  dayCellSelected: {
    backgroundColor: COLORS.BROWN_DARK,
  },
  dayNumber: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
    fontWeight: '500',
  },
  dayNumberSelected: {
    color: COLORS.WHITE,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.ORANGE,
    marginTop: 2,
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
  },
  detailLink: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  detailLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ORANGE,
  },

  // Distribution bar
  distributionBarContainer: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.CREAM,
    overflow: 'hidden',
    marginTop: 4,
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.ORANGE,
  },
});
