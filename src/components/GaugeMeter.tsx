import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal, TextInput} from 'react-native';
import Svg, {Path, Line, Polygon, Circle, Text as SvgText} from 'react-native-svg';
import {Target} from 'lucide-react-native';

interface GaugeMeterProps {
  currentAmount: number;
  targetAmount: number;
  onTargetSave: (target: number) => void;
  size?: number;
}

const COLOR_STOPS: {pct: number; r: number; g: number; b: number}[] = [
  {pct: 0, r: 239, g: 68, b: 68},
  {pct: 20, r: 249, g: 115, b: 22},
  {pct: 40, r: 234, g: 179, b: 8},
  {pct: 60, r: 132, g: 204, b: 22},
  {pct: 80, r: 22, g: 163, b: 74},
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

export function getGaugeColor(pct: number): string {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct);
      return `rgb(${lerp(a.r, b.r, t)},${lerp(a.g, b.g, t)},${lerp(a.b, b.b, t)})`;
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  return `rgb(${last.r},${last.g},${last.b})`;
}

function getStatusLabel(pct: number) {
  if (pct >= 100) return 'Target Achieved!';
  if (pct >= 80) return 'Almost There';
  if (pct >= 60) return 'Good Progress';
  if (pct >= 40) return 'On Track';
  if (pct >= 20) return 'Getting Started';
  return 'Just Started';
}

function formatCompactCurrency(val: number) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString();
}

const DEFAULT_SIZE = 200;
const START_ANGLE = -210;
const END_ANGLE = 30;
const TOTAL_ANGLE = END_ANGLE - START_ANGLE;
const SEGMENTS = 200;
const MAJOR_TICKS = [0, 20, 40, 60, 80, 100];
const MID_TICKS = [10, 30, 50, 70, 90];

type Geometry = {
  s: number;
  cx: number;
  cy: number;
  outR: number;
  inR: number;
};

function buildGeometry(size: number): Geometry {
  const s = size / DEFAULT_SIZE;
  return {
    s,
    cx: size / 2,
    cy: size / 2 + 8 * s,
    outR: 68 * s,
    inR: 8 * s,
  };
}

function polarToCartesian(angle: number, radius: number, geo: Geometry) {
  const rad = (angle * Math.PI) / 180;
  return {x: geo.cx + radius * Math.cos(rad), y: geo.cy + radius * Math.sin(rad)};
}

function buildArcSegments(geo: Geometry) {
  return Array.from({length: SEGMENTS}, (_, i) => {
    const fromPct = (i / SEGMENTS) * 100;
    const toPct = ((i + 1) / SEGMENTS) * 100;
    const midPct = (fromPct + toPct) / 2;
    const color = getGaugeColor(midPct);
    const a1 = START_ANGLE + (fromPct / 100) * TOTAL_ANGLE;
    const a2 = START_ANGLE + (toPct / 100) * TOTAL_ANGLE;
    const os1 = polarToCartesian(a1, geo.outR, geo);
    const os2 = polarToCartesian(a2, geo.outR, geo);
    const is1 = polarToCartesian(a1, geo.inR, geo);
    const is2 = polarToCartesian(a2, geo.inR, geo);
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    const d = `M ${os1.x} ${os1.y} A ${geo.outR} ${geo.outR} 0 ${largeArc} 1 ${os2.x} ${os2.y} L ${is2.x} ${is2.y} A ${geo.inR} ${geo.inR} 0 ${largeArc} 0 ${is1.x} ${is1.y} Z`;
    return {d, color};
  });
}

export default function GaugeMeter({
  currentAmount,
  targetAmount,
  onTargetSave,
  size = DEFAULT_SIZE,
}: GaugeMeterProps) {
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState(targetAmount > 0 ? String(targetAmount) : '');
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const geo = useMemo(() => buildGeometry(size), [size]);
  const arcSegments = useMemo(() => buildArcSegments(geo), [geo]);

  const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

  useEffect(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    const start = animatedPercent;
    const end = percentage;
    const diff = end - start;
    if (Math.abs(diff) < 0.1) {
      setAnimatedPercent(end);
      return;
    }
    const duration = 1200;
    const steps = 80;
    const increment = diff / steps;
    let step = 0;
    animationRef.current = setInterval(() => {
      step++;
      if (step >= steps) {
        setAnimatedPercent(end);
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      } else {
        setAnimatedPercent(start + increment * step);
      }
    }, duration / steps);
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const handleSaveTarget = () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      onTargetSave(val);
      setShowTargetModal(false);
    }
  };

  const needleAngle = START_ANGLE + (animatedPercent / 100) * TOTAL_ANGLE;
  const needleTip = polarToCartesian(needleAngle, geo.outR + 2, geo);
  const baseLen = 8 * geo.s;
  const base1 = {
    x: geo.cx + baseLen * Math.cos(((needleAngle + 90) * Math.PI) / 180),
    y: geo.cy + baseLen * Math.sin(((needleAngle + 90) * Math.PI) / 180),
  };
  const base2 = {
    x: geo.cx + baseLen * Math.cos(((needleAngle - 90) * Math.PI) / 180),
    y: geo.cy + baseLen * Math.sin(((needleAngle - 90) * Math.PI) / 180),
  };

  const getTickLength = (tick: number) => {
    if (MAJOR_TICKS.includes(tick)) return 16 * geo.s;
    if (MID_TICKS.includes(tick)) return 10 * geo.s;
    return 5 * geo.s;
  };

  const getTickWidth = (tick: number) => {
    if (MAJOR_TICKS.includes(tick)) return 2;
    if (MID_TICKS.includes(tick)) return 1.5;
    return 0.8;
  };

  const ticks = Array.from({length: 101}, (_, i) => i);

  return (
    <>
      <View style={styles.card}>
        <Svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
          {arcSegments.map((seg, i) => (
            <Path key={i} d={seg.d} fill={seg.color} />
          ))}

          {ticks.map(tick => {
            const angle = START_ANGLE + (tick / 100) * TOTAL_ANGLE;
            const tipR = geo.outR - 1;
            const baseR = tipR - getTickLength(tick);
            const tip = {
              x: geo.cx + tipR * Math.cos((angle * Math.PI) / 180),
              y: geo.cy + tipR * Math.sin((angle * Math.PI) / 180),
            };
            const base = {
              x: geo.cx + baseR * Math.cos((angle * Math.PI) / 180),
              y: geo.cy + baseR * Math.sin((angle * Math.PI) / 180),
            };
            return (
              <Line
                key={tick}
                x1={base.x}
                y1={base.y}
                x2={tip.x}
                y2={tip.y}
                stroke="#1f2937"
                strokeWidth={getTickWidth(tick)}
                strokeLinecap="round"
              />
            );
          })}

          {MAJOR_TICKS.map(tick => {
            const angle = START_ANGLE + (tick / 100) * TOTAL_ANGLE;
            const labelR = geo.outR + 14 * geo.s;
            const label = {
              x: geo.cx + labelR * Math.cos((angle * Math.PI) / 180),
              y: geo.cy + labelR * Math.sin((angle * Math.PI) / 180),
            };
            return (
              <SvgText
                key={tick}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontSize={Math.max(6, Math.round(8 * geo.s))}
                fontWeight="600"
                fill="#6b7280">
                {tick}
              </SvgText>
            );
          })}

          <Polygon
            points={`${needleTip.x},${needleTip.y} ${base1.x},${base1.y} ${geo.cx},${geo.cy} ${base2.x},${base2.y}`}
            fill="#1f2937"
          />
          <Circle cx={geo.cx} cy={geo.cy} r={7 * geo.s} fill="#374151" />
          <Circle cx={geo.cx} cy={geo.cy} r={4.5 * geo.s} fill="#6b7280" />
          <Circle cx={geo.cx} cy={geo.cy} r={2 * geo.s} fill="#9ca3af" />
        </Svg>

        <View style={styles.digitalDisplay}>
          <Text style={[styles.percentText, {color: getGaugeColor(animatedPercent)}]}>
            {animatedPercent.toFixed(1)}%
          </Text>
          <Text style={[styles.statusText, {color: getGaugeColor(animatedPercent)}]}>
            {getStatusLabel(animatedPercent)}
          </Text>
          <Text style={styles.counterText}>
            PKR {formatCompactCurrency(currentAmount)} / {formatCompactCurrency(targetAmount)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.setTargetButton}
          onPress={() => {
            setTargetInput(targetAmount > 0 ? String(targetAmount) : '');
            setShowTargetModal(true);
          }}>
          <Target size={12} color="#374151" />
          <Text style={styles.setTargetText}>Set Target</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTargetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTargetModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Collection Target</Text>
            <Text style={styles.modalLabel}>Target Amount (PKR)</Text>
            <TextInput
              style={styles.modalInput}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="numeric"
              placeholder="e.g. 500000.00"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <Text style={styles.modalHint}>
              Enter the total collection target. Supports decimal points.
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, (!targetInput || parseFloat(targetInput) <= 0) && styles.saveButtonDisabled]}
              onPress={handleSaveTarget}
              disabled={!targetInput || parseFloat(targetInput) <= 0}>
              <Text style={styles.saveButtonText}>Save Target</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTargetModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  digitalDisplay: {
    alignItems: 'center',
    marginTop: -14,
  },
  percentText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  counterText: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
  },
  setTargetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
  },
  setTargetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  modalHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
