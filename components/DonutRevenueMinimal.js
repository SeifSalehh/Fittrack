// components/DonutRevenueMinimal.js
import React from 'react';
import { View } from 'react-native';
import Svg, { G, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function DonutRevenueMinimal({
  value = 0,
  goal = 1000,
  currency = '€',
  size = 140,
  strokeWidth = 12,
  trackColor = '#2a2a2a',
  textColor = '#ffffff',
  accentStart = '#35e68b',
  accentEnd = '#1db954',
}) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  const dashOffset = C * (1 - pct);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="revGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={accentStart} />
            <Stop offset="100%" stopColor={accentEnd} />
          </LinearGradient>
        </Defs>

        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          <Circle cx={size/2} cy={size/2} r={r} stroke={trackColor} strokeWidth={strokeWidth} opacity={0.35} fill="none" />
          <Circle
            cx={size/2} cy={size/2} r={r}
            stroke="url(#revGrad)" strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${C} ${C}`} strokeDashoffset={dashOffset} fill="none"
          />
        </G>

        {/* CENTER VALUE ONLY */}
        <SvgText x="50%" y="54%" fontSize={size * 0.26} fontWeight="700" fill={textColor} textAnchor="middle">
          {Math.round(value).toLocaleString()} {/* TODO: add currency in the future*/}
        </SvgText>
      </Svg>
    </View>
  );
}
