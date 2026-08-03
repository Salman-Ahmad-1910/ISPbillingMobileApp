import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, LayoutChangeEvent} from 'react-native';
import Svg, {Path, LinearGradient, Stop, Defs} from 'react-native-svg';
import {Wallet, Users} from 'lucide-react-native';
import {getCollectionChart, getSubscriberGrowthChart} from '../api/dashboard';
import {ChartPoint} from '../types';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface AreaChartProps {
  type: 'collection' | 'growth';
  liveActiveCount?: number;
}

const PERIOD_TABS: {key: Period; label: string}[] = [
  {key: 'daily', label: '1D'},
  {key: 'weekly', label: '1W'},
  {key: 'monthly', label: '1M'},
  {key: 'yearly', label: '1Y'},
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseServerDate(label: string): Date {
  return new Date(label.includes(' ') ? label.replace(' ', 'T') : label);
}

function formatCurrency(value: number) {
  if (value >= 10000000) return `PKR ${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 1000000) return `PKR ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`;
  return `PKR ${value.toLocaleString()}`;
}

function formatAxisLabel(label: string, period: Period): string {
  if (!label) return label;
  if (period === 'weekly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return DAY_NAMES[d.getDay()];
    return label;
  }
  if (period === 'monthly') {
    const d = new Date(label);
    if (!isNaN(d.getTime())) return String(d.getDate());
    return label;
  }
  if (period === 'yearly') {
    const parts = label.split('-');
    if (parts.length >= 2) return MONTH_NAMES[parseInt(parts[1], 10) - 1] || label;
    return label;
  }
  return label;
}

function monthOptions(): string[] {
  const today = new Date();
  const options: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    options.push(m.toISOString().slice(0, 7));
  }
  return options;
}

export default function AreaChart({type, liveActiveCount}: AreaChartProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [rawData, setRawData] = useState<ChartPoint[]>([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = !selectedMonth || selectedMonth === today.toISOString().slice(0, 7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (type === 'collection') {
        const result = await getCollectionChart(period, selectedMonth || undefined);
        setRawData(result.data || []);
        setPeriodTotal(result.periodTotal || 0);
      } else {
        const result = await getSubscriberGrowthChart(period, selectedMonth || undefined);
        setRawData(result.data || []);
      }
    } catch {
      setRawData([]);
      setPeriodTotal(0);
    } finally {
      setLoading(false);
    }
  }, [type, period, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const effectiveLiveCount =
    type === 'growth' && typeof liveActiveCount === 'number' && !isNaN(liveActiveCount)
      ? liveActiveCount
      : rawData.length > 0
      ? rawData[rawData.length - 1].value
      : 0;

  const data = useMemo(() => {
    if (period === 'daily') {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return rawData.map(p => {
        const d = parseServerDate(p.label);
        return {hour: (d.getTime() - startOfDay) / 3600000, label: p.label, value: p.value};
      });
    }
    return rawData.map(p => ({label: p.label, value: p.value}));
  }, [rawData, period, today]);

  const {endValue, changeAbs, changePct, isUp} = useMemo(() => {
    if (data.length === 0) return {startValue: 0, endValue: 0, changeAbs: 0, changePct: 0, isUp: true};
    const start = data[0].value;
    const end = type === 'growth' && (period === 'daily' || isCurrentMonth)
      ? effectiveLiveCount
      : data[data.length - 1].value;
    const abs = end - start;
    const pct = start !== 0 ? (abs / start) * 100 : abs > 0 ? 100 : 0;
    return {startValue: start, endValue: end, changeAbs: abs, changePct: pct, isUp: abs >= 0};
  }, [data, period, isCurrentMonth, type, effectiveLiveCount]);

  const lineColor = isUp ? '#0f9d58' : '#d93025';
  const gradientId = `grad_${type}_${period}`;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - chartWidth) > 1) {
      setChartWidth(w);
    }
  };

  const chartHeight = 170;
  const xLabelsCount = Math.min(5, data.length);

  const {path, areaPath, axisLabels} = useMemo(() => {
    if (data.length === 0 || chartWidth <= 0) {
      return {path: '', areaPath: '', axisLabels: [] as string[]};
    }
    const vals = data.map(d => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = Math.max((max - min) * 0.25, 1);
    const yMin = Math.max(0, Math.floor(min - padding));
    const yMax = Math.ceil(max + padding);
    const range = yMax - yMin || 1;

    const points = data.map((p, i) => ({
      x: (i / Math.max(data.length - 1, 1)) * chartWidth,
      y: chartHeight - ((p.value - yMin) / range) * chartHeight,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i - 1].y}`;
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    const area = `${d} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    const labelIdx: number[] = [];
    for (let i = 0; i < xLabelsCount; i++) {
      labelIdx.push(Math.round((i / Math.max(xLabelsCount - 1, 1)) * (data.length - 1)));
    }
    const labels = labelIdx.map(i => data[i]?.label || '');

    return {path: d, areaPath: area, axisLabels: labels};
  }, [data, chartWidth, xLabelsCount]);

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const d = new Date(selectedMonth + '-01');
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }, [selectedMonth]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {type === 'collection' ? (
          <Wallet size={14} color="#71717A" />
        ) : (
          <Users size={14} color="#71717A" />
        )}
        <Text style={styles.headerTitle}>
          {type === 'collection' ? 'Collection' : 'Active Subscribers'}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryValue}>
            {type === 'collection' ? formatCurrency(endValue) : String(Math.round(endValue))}
          </Text>
          <Text style={[styles.changeText, {color: lineColor}]}>
            {isUp ? '▲' : '▼'} {type === 'collection' ? formatCurrency(Math.abs(changeAbs)) : String(Math.abs(Math.round(changeAbs)))} (
            {isUp ? '+' : ''}
            {changePct.toFixed(2)}%)
          </Text>
        </View>
        {period === 'monthly' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthScroll}>
            {monthOptions().map(m => {
              const d = new Date(m + '-01');
              const label = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
              const isSelected = m === (selectedMonth || today.toISOString().slice(0, 7));
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMonth(isSelected ? '' : m)}
                  style={[styles.monthChip, isSelected && styles.monthChipActive]}>
                  <Text style={[styles.monthChipText, isSelected && styles.monthChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.chartContainer} onLayout={onLayout}>
        {loading ? (
          <View style={[styles.centerState, {height: chartHeight}]}>
            <ActivityIndicator size="small" color="#09090B" />
          </View>
        ) : data.length === 0 ? (
          <View style={[styles.centerState, {height: chartHeight}]}>
            {type === 'collection' ? (
              <Wallet size={28} color="#71717A" style={styles.emptyIcon} />
            ) : (
              <Users size={28} color="#71717A" style={styles.emptyIcon} />
            )}
            <Text style={styles.emptyText}>
              {type === 'collection' ? 'No collection data yet' : 'No subscribers yet'}
            </Text>
          </View>
        ) : chartWidth > 0 ? (
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill={`url(#${gradientId})`} />
            <Path d={path} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </Svg>
        ) : null}
        {!loading && data.length > 0 && (
          <View style={styles.axisRow}>
            {axisLabels.map((label, i) => {
              const display = formatAxisLabel(label, period);
              return (
                <View key={i} style={[styles.axisLabelWrap, {flex: 1, alignItems: i === 0 ? 'flex-start' : i === axisLabels.length - 1 ? 'flex-end' : 'center'}]}>
                  <Text style={styles.axisLabel} numberOfLines={1}>
                    {period === 'daily' && type === 'collection' && rawData[i] ? label : display}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.tabsRow}>
        {PERIOD_TABS.map(tab => {
          const active = period === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setPeriod(tab.key);
                if (tab.key !== 'monthly') {
                  setSelectedMonth('');
                }
              }}
              style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {type === 'collection' && (
        <View style={styles.periodTotalRow}>
          <Text style={styles.periodTotalLabel}>
            {period === 'daily' && "Today's Collection"}
            {period === 'weekly' && "This Week's Collection"}
            {period === 'monthly' &&
              (selectedMonthLabel ? `${selectedMonthLabel} Collection` : "This Month's Collection")}
            {period === 'yearly' && "This Year's Collection"}
          </Text>
          <Text style={styles.periodTotalValue}>{formatCurrency(periodTotal)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    color: '#71717A',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#09090B',
    fontVariant: ['tabular-nums'],
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  monthScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
  },
  monthChipActive: {
    backgroundColor: '#09090B',
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
  },
  monthChipTextActive: {
    color: '#F5F5F5',
  },
  chartContainer: {
    marginTop: 10,
  },
  centerState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 6,
  },
  axisRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  axisLabelWrap: {
    paddingHorizontal: 2,
  },
  axisLabel: {
    fontSize: 9,
    color: '#71717A',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    paddingTop: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: '#09090B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  tabTextActive: {
    color: '#F5F5F5',
  },
  periodTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  periodTotalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    flex: 1,
    marginRight: 8,
  },
  periodTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
    fontVariant: ['tabular-nums'],
  },
});
