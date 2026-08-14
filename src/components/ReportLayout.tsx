import React, {useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import {useNavigation, DrawerActions} from '@react-navigation/native';
import {useDrawerStatus} from '@react-navigation/drawer';
import Svg, {Rect, Defs, LinearGradient, Stop} from 'react-native-svg';
import type {ComponentType, ReactNode} from 'react';
import {GradientView} from './GradientView';

type IconType = ComponentType<{size?: number; color?: string; strokeWidth?: number}>;

const GREEN_ACCENT: [string, string] = ['#166534', '#22c55e'];

export function DoorMenuIcon({open}: {open: boolean}) {
  const slide = React.useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slide, {toValue: open ? 1 : 0, duration: 200, useNativeDriver: true}).start();
  }, [open, slide]);
  const translateX = slide.interpolate({inputRange: [0, 1], outputRange: [-3, 3]});
  return (
    <View style={styles.doorIconBox}>
      <Animated.View style={[styles.doorIconLine, {transform: [{translateX}]}]} />
    </View>
  );
}

function HeroDivider({accent}: {accent: [string, string]}) {
  return (
    <View style={styles.heroDivider}>
      <Svg height="2" width="100%">
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent[0]} stopOpacity="1" />
            <Stop offset="0.7" stopColor={accent[1]} stopOpacity="0.6" />
            <Stop offset="1" stopColor={accent[1]} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#heroGrad)" />
      </Svg>
    </View>
  );
}

export function KpiRow({children}: {children: ReactNode}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
      {children}
    </ScrollView>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  bg,
  fg,
}: {
  label: string;
  value: string | number;
  icon: IconType;
  bg: string;
  fg: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <View style={[styles.kpiIconBox, {backgroundColor: bg}]}>
          <Icon size={16} color={fg} />
        </View>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function GreenButton({
  onPress,
  loading = false,
  label,
  icon: Icon,
}: {
  onPress: () => void;
  loading?: boolean;
  label: string;
  icon?: IconType;
}) {
  return (
    <TouchableOpacity style={styles.greenWrap} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      <GradientView colors={GREEN_ACCENT} style={styles.greenBtn}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            {Icon ? <Icon size={15} color="#FFFFFF" /> : null}
            <Text style={styles.greenBtnText}>{label}</Text>
          </>
        )}
      </GradientView>
    </TouchableOpacity>
  );
}

export default function ReportLayout({
  title,
  subtitle,
  icon: Icon,
  accent,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  subtitle: string;
  icon: IconType;
  accent: [string, string];
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const navigation = useNavigation<any>();
  const drawerStatus = useDrawerStatus();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return (
    <View style={styles.container}>
      <GradientView colors={GREEN_ACCENT} style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <DoorMenuIcon open={drawerStatus === 'open'} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
      </GradientView>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          refreshing != null ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_ACCENT[1]]} />
          ) : undefined
        }>
        <View style={styles.heroHeader}>
          <GradientView colors={accent} style={styles.heroIconBox}>
            <Icon size={20} color="#FFFFFF" />
          </GradientView>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <HeroDivider accent={accent} />
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  body: {paddingBottom: 40},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 50,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#166534',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#166534',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topBarTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingRight: 8},
  doorIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doorIconLine: {
    width: 12,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroInfo: {flex: 1},
  heroTitle: {fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.5},
  heroSubtitle: {fontSize: 12, color: '#6B7280', marginTop: 2},
  heroDivider: {height: 2, marginHorizontal: 20, marginBottom: 4},
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  kpiCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {fontSize: 10, color: '#6B7280', fontWeight: '500', flex: 1, flexWrap: 'wrap'},
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  kpiValue: {fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 8},
  greenWrap: {flex: 1, borderRadius: 10, overflow: 'hidden'},
  greenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  greenBtnText: {color: '#FFFFFF', fontSize: 13, fontWeight: '700'},
});
