import { Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';

export default function AuthLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.CREAM },
      }}
    />
  );
}
