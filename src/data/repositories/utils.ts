import NetInfo from '@react-native-community/netinfo';
import { OfflineError } from '../errors';

export async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  const isOnline = (state.isConnected ?? false) && (state.isInternetReachable ?? false);
  if (!isOnline) {
    throw new OfflineError();
  }
}
