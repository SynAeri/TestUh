import { useEffect, useState } from 'react';
import { Paths } from 'expo-file-system';

type StorageStats = {
  availableBytes: number;
  totalBytes: number;
  usedBytes: number;
  usedPercentage: number;
};

function getStorageStats(): StorageStats {
  const totalBytes = Paths.totalDiskSpace ?? 0;
  const availableBytes = Paths.availableDiskSpace ?? 0;
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usedPercentage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  return {
    availableBytes,
    totalBytes,
    usedBytes,
    usedPercentage,
  };
}

export function useStorageStats() {
  const [stats, setStats] = useState<StorageStats>(() => getStorageStats());

  useEffect(() => {
    setStats(getStorageStats());
  }, []);

  return stats;
}
