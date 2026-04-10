import { Tabs } from 'expo-router';
import { Home, ListTodo, Calendar, User } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { COLORS } from '@/constants/colors';

export default function TabsLayout(): React.ReactElement {
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      {!isOnline && (
        <View
          testID="offline-banner"
          accessible
          accessibilityRole="alert"
          accessibilityLabel={t('offline.bannerHint')}
          style={{ backgroundColor: COLORS.BROWN_DARK, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: COLORS.WHITE, textAlign: 'center', fontSize: 14 }}>
            {t('offline.banner')}
          </Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: COLORS.WHITE, borderTopColor: COLORS.BROWN_LIGHT },
          tabBarActiveTintColor: COLORS.ORANGE,
          tabBarInactiveTintColor: COLORS.BROWN_DARK,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            tabBarAccessibilityLabel: t('tabs.home'),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: t('tabs.tasks'),
            tabBarIcon: ({ color, size }) => <ListTodo color={color} size={size} />,
            tabBarAccessibilityLabel: t('tabs.tasks'),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('tabs.calendar'),
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
            tabBarAccessibilityLabel: t('tabs.calendar'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            tabBarAccessibilityLabel: t('tabs.profile'),
          }}
        />
      </Tabs>
    </View>
  );
}
