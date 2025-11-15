import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Card, Button, colors } from './UI';

export default function SessionCard({
  title,
  clientName,
  mode,
  startAt,
  endAt,
  status = 'scheduled',
  isPaid = false,
  showComplete = false,
  onComplete,
}) {
  // Main display name
  const mainName = clientName || title || 'Session';

  // If clientName !== title, show the second line
  const subtitle =
    clientName && title && clientName !== title ? title : null;

  const modeLabel = (() => {
    if (!mode) return '';
    if (mode === 'in_person' || mode === 'in-person') return 'In person';
    if (mode === 'online') return 'Online';
    return mode;
  })();

  const statusLabel =
    status.charAt(0).toUpperCase() + status.slice(1);

  const statusColor = (() => {
    if (status === 'completed') return colors.success || '#16a34a';
    if (status === 'pending') return colors.warning || '#eab308';
    if (status === 'cancelled') return '#ef4444';
    return colors.primary || '#22c55e';
  })();

  const dateLabel = startAt ? dayjs(startAt).format('ddd, D MMM') : '';
  const timeLabel = startAt
    ? `${dayjs(startAt).format('HH:mm')} → ${endAt ? dayjs(endAt).format('HH:mm') : ''}`
    : '';

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{mainName}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.chipsRow}>
          {modeLabel ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{modeLabel}</Text>
            </View>
          ) : null}

          <View style={[styles.chip, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.chipText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>

          {isPaid && (
            <View style={[styles.chip, styles.paidChip]}>
              <Text style={[styles.chipText, styles.paidText]}>Paid</Text>
            </View>
          )}
        </View>
      </View>

      {dateLabel ? <Text style={styles.dateText}>{dateLabel}</Text> : null}

      <View style={styles.bottomRow}>
        <Text style={styles.timeText}>{timeLabel}</Text>
        {showComplete && (
          <Button title="Complete" onPress={onComplete} style={{ minWidth: 110 }} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted || '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#1f2933',
  },
  chipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  paidChip: {
    backgroundColor: '#16a34a22',
  },
  paidText: {
    color: '#22c55e',
  },
  dateText: {
    color: colors.muted || '#a1a1aa',
    fontSize: 12,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    color: colors.text,
    fontSize: 13,
  },
});
