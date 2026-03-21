import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type StorageWaterGaugeProps = {
  label: string;
  percentage: number;
  size?: number;
  onPress?: () => void;
};

export function StorageWaterGauge({
  label,
  percentage,
  size = 170,
  onPress,
}: StorageWaterGaugeProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const isCritical = clampedPercentage >= 90;
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    fillProgress.value = withTiming(clampedPercentage / 100, {
      duration: 1400,
    });
  }, [clampedPercentage, fillProgress]);

  const waterLayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - fillProgress.value) * size }],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${label} storage`}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.jar,
          isCritical ? styles.jarCritical : null,
          onPress ? styles.jarPressable : null,
          pressed ? styles.jarPressed : null,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}>
        <View
          style={[
            styles.jarInner,
            {
              width: size - 10,
              height: size - 10,
              borderRadius: (size - 10) / 2,
            },
          ]}>
          <Animated.View
            style={[
              styles.waterLayer,
              waterLayerStyle,
              {
                width: size - 10,
                height: size,
              },
            ]}>
            <View style={styles.waterBody} />
          </Animated.View>

          <View style={styles.textOverlay}>
            <Animated.Text style={styles.percent}>{Math.round(clampedPercentage)}%</Animated.Text>
            <Animated.Text style={styles.label}>{label}</Animated.Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
  },
  jar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(31, 78, 121, 0.34)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  jarPressable: {
    shadowColor: 'rgba(31, 78, 121, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  jarPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  jarCritical: {
    borderColor: 'rgba(185, 28, 28, 0.58)',
    shadowColor: 'rgba(220, 38, 38, 0.45)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  jarInner: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  waterLayer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  waterBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 196, 255, 0.68)',
  },
  textOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  percent: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    color: 'rgba(17, 24, 39, 0.58)',
    fontSize: 13,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
