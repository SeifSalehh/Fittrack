// components/SessionCard.jsx
import React from 'react';
import { View, Text } from 'react-native';
import dayjs from 'dayjs';
import { Card, Button, colors } from './UI';

function Chip({ children, tone = 'neutral' }) {
  const map = {
    neutral: { bg: '#1d1d1d', fg: colors.subtext, border: colors.border },
    good:    { bg: '#11271a', fg: '#7DDE9D', border: '#1f3a29' },
    warn:    { bg: '#2a1b1b', fg: '#FF9E9E', border: '#3a2323' },
    accent:  { bg: '#10251a', fg: colors.accent, border: '#1c3a2a' },
  };
  const { bg, fg, border } = map[tone] || map.neutral;
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 999, backgroundColor: bg, borderWidth: 1, borderColor: border
    }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

export default function SessionCard({
  title, mode, clientName,
  startAt, endAt, status,
  onComplete, showComplete
}) {
  const start = dayjs(startAt);
  const end   = endAt ? dayjs(endAt) : null;
  const prettyDate = start.format('ddd, DD MMM');
  const prettyTime = `${start.format('HH:mm')}${end ? ` → ${end.format('HH:mm')}` : ''}`;

  const statusTone =
    status === 'completed' ? 'good' :
    status === 'cancelled' ? 'warn' : 'accent';

  return (
    <Card style={{ padding: 14, gap: 10 }}>
      {/* top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          {title || (mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Session')}
          {clientName ? ` · ${clientName}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
        {mode ? (
        <Chip tone="neutral">
            {mode === 'in_person' ? 'In person'
      : mode === 'online' ? 'Online'
      : mode}
  </Chip>
) : null}
          <Chip tone={statusTone}>{status || 'scheduled'}</Chip>
        </View>
      </View>

      {/* date row */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        backgroundColor: '#151515', borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, padding: 10
      }}>
        <Text style={{ color: colors.subtext }}>{prettyDate}</Text>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{prettyTime}</Text>
      </View>

      {/* action */}
      {showComplete ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Button title="Complete" onPress={onComplete} />
        </View>
      ) : null}
    </Card>
  );
}
