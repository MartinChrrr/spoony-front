import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function CalendarScreen(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-cream items-center justify-center">
      <Text className="text-brown-dark text-lg">{t('tabs.calendar')}</Text>
    </View>
  );
}
