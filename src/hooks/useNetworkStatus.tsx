import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: false,
    isConnected: false,
  });

  useEffect(() => {
    void NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isOnline: (state.isConnected ?? false) && (state.isInternetReachable ?? false),
      });
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isOnline: (state.isConnected ?? false) && (state.isInternetReachable ?? false),
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
