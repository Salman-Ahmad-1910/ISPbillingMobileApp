import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, ViewStyle} from 'react-native';
import {ArrowLeft} from 'lucide-react-native';

interface AnimatedBackArrowProps {
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export default function AnimatedBackArrow({
  onPress,
  color = '#4F46E5',
  style,
}: AnimatedBackArrowProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  }, [enter]);

  const handlePressIn = () => {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(press, {
      toValue: 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const translateX = Animated.add(
    enter.interpolate({inputRange: [0, 1], outputRange: [-14, 0]}),
    press.interpolate({inputRange: [0, 1], outputRange: [0, -5]}),
  );

  const opacity = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={10}
      style={[styles.button, style]}>
      <Animated.View style={{opacity, transform: [{translateX}, {scale}]}}>
        <ArrowLeft size={22} color={color} strokeWidth={2.4} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
