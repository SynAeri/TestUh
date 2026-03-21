import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StorageWaterGauge } from '@/components/storage-water-gauge';
import { useStorageStats } from '@/hooks/use-storage-stats';

export default function HomeScreen() {
  const router = useRouter();
  const { usedPercentage } = useStorageStats();
  const desktopUsedPercentage = 42;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.gaugeRow}>
        <View style={styles.mobileJar}>
          <StorageWaterGauge
            label="Mobile"
            percentage={usedPercentage}
            size={146}
            onPress={() => router.push('/my-files')}
          />
        </View>
        <View style={styles.desktopJar}>
          <StorageWaterGauge label="Laptop / PC" percentage={desktopUsedPercentage} size={184} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gaugeRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileJar: {
    alignSelf: 'flex-start',
    marginLeft: 18,
    marginBottom: -18,
  },
  desktopJar: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
});
