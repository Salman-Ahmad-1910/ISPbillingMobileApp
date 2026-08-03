import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ChartPoint} from '../types';

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  labelColor?: string;
}

export function BarChart({
  data,
  height = 160,
  color = '#4F46E5',
  labelColor = '#9CA3AF',
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, {height}]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(1, Math.floor(280 / data.length) - 4);

  return (
    <View style={[styles.container, {height}]}>
      <View style={styles.chartArea}>
        {data.map((point, index) => {
          const barHeight = Math.max(2, (point.value / maxValue) * (height - 40));
          const shortLabel = point.label.length > 5
            ? point.label.slice(-5)
            : point.label;

          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={[styles.barValue, {color}]}>
                {point.value >= 1000
                  ? `${(point.value / 1000).toFixed(1)}k`
                  : Math.round(point.value).toString()}
              </Text>
              <View style={[styles.barContainer, {height: height - 50}]}>
                <View
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                      width: barWidth,
                      opacity: 0.85,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, {color: labelColor}]} numberOfLines={1}>
                {shortLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  _fillColor?: string;
}

export function LineChart({
  data,
  height = 160,
  color = '#4F46E5',
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, {height}]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  const chartWidth = 280;
  const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

  const points = data.map((point, index) => ({
    x: index * pointSpacing,
    y: ((point.value - minValue) / range) * (height - 50),
  }));

  return (
    <View style={[styles.container, {height}]}>
      <View style={styles.lineChartArea}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <View
            key={i}
            style={[
              styles.gridLine,
              {bottom: 30 + ratio * (height - 50)},
            ]}
          />
        ))}

        {/* Points and connecting lines */}
        {points.map((point, index) => (
          <React.Fragment key={index}>
            {index < points.length - 1 && (
              <View
                style={[
                  styles.lineSegment,
                  {
                    left: point.x + 4,
                    bottom: 30 + point.y,
                    width: pointSpacing,
                    transform: [
                      {
                        rotate: `${-Math.atan2(
                          points[index + 1].y - point.y,
                          pointSpacing,
                        ) * (180 / Math.PI)}deg`,
                      },
                    ],
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.linePoint,
                {
                  left: point.x,
                  bottom: 28 + point.y,
                  backgroundColor: color,
                },
              ]}
            />
          </React.Fragment>
        ))}

        {/* Labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((point, i) => {
          const originalIndex = data.indexOf(point);
          const xPos = originalIndex * pointSpacing;
          const shortLabel = point.label.length > 5
            ? point.label.slice(-5)
            : point.label;

          return (
            <Text
              key={i}
              style={[styles.lineLabel, {left: xPos, color: '#9CA3AF'}]}
              numberOfLines={1}>
              {shortLabel}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 13,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
  },
  barContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    borderRadius: 3,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  lineChartArea: {
    position: 'relative',
    paddingTop: 10,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#4F46E5',
    opacity: 0.6,
    transformOrigin: 'left',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginBottom: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  lineLabel: {
    position: 'absolute',
    bottom: 10,
    fontSize: 8,
    transform: [{translateX: -15}],
  },
});
