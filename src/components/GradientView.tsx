import React, {useId, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

interface GradientViewProps {
  colors: [string, string];
  style?: any;
  start?: {x: number | string; y: number | string};
  end?: {x: number | string; y: number | string};
  children?: React.ReactNode;
}

export function GradientView({colors, style, start, end, children}: GradientViewProps) {
  const [size, setSize] = useState<{w: number; h: number} | null>(null);
  const id = 'grad' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const radius = StyleSheet.flatten(style)?.borderRadius ?? 0;
  const startCoord = start ?? {x: '0%', y: '0%'};
  const endCoord = end ?? {x: '100%', y: '100%'};
  return (
    <View
      onLayout={e => setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}
      style={[styles.base, style]}>
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient
              id={id}
              x1={startCoord.x}
              y1={startCoord.y}
              x2={endCoord.x}
              y2={endCoord.y}>
              <Stop offset="0%" stopColor={colors[0]} />
              <Stop offset="100%" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={radius} fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {overflow: 'hidden'},
});
