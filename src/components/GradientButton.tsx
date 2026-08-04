import React, {useState} from 'react';
import {TouchableOpacity, StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

interface GradientButtonProps {
  colors: [string, string];
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function GradientButton({
  colors,
  style,
  onPress,
  disabled,
  children,
}: GradientButtonProps) {
  const [size, setSize] = useState<{w: number; h: number} | null>(null);
  const radius = StyleSheet.flatten(style)?.borderRadius ?? 10;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      onLayout={e =>
        setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})
      }
      style={[styles.base, style]}>
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="btnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} />
              <Stop offset="100%" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={radius} fill="url(#btnGradient)" />
        </Svg>
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
