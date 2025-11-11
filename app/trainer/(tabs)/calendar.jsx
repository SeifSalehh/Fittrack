// app/trainer/(tabs)/calendar.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, Platform, SectionList, View } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';

export default function TrainerCalendar() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(dayjs().format('YYYY-MM-DD'));
  const [deviceCalendarId, setDeviceCalendarId] = useState(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('sessions')
      .select('id, start_at, end_at, status, mode, client_id, clients(name)')
      .eq('trainer_id', user.id)
      .order('start_at', { ascending: true });

    if (error) { Alert.alert('Load error', error.message); return; }
    setSessions(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      const { status: cStatus } = await Calendar.requestCalendarPermissionsAsync();
      const { status: nStatus } = await Notifications.requestPermissionsAsync();
      if (cStatus !== 'granted') Alert.alert('Calendar permission needed');
      if (nStatus !== 'granted') Alert.alert('Notification permission needed');

      const all = await Calendar.getCalendarsAsync();
      const existing = all.find(c => c.title === 'FitTrack (Trainer)');
      if (existing) { setDeviceCalendarId(existing.id); return; }

      const src = Platform.OS === 'ios'
        ? (await Calendar.getDefaultCalendarAsync()).source
        : { isLocalAccount: true, name: 'FitTrack (Trainer)' };

      const id = await Calendar.createCalendarAsync({
        title: 'FitTrack (Trainer)',
        color: colors.accent,
        entityType: Calendar.EntityTypes.EVENT,
        source: src,
        sourceId: src?.id,
        name: 'FitTrack (Trainer)',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      setDeviceCalendarId(id);
    })();
  }, []);

  const sections = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const d = dayjs(s.start_at).format('YYYY-MM-DD');
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(s);
    }
    return Array.from(map.entries())
      .map(([date, data]) => ({ title: date, data }))
      .sort((a, b) => (a.title > b.title ? 1 : -1));
  }, [sessions]);

  const marked = useMemo(() => {
    const m = {};
    for (const { title } of sections) m[title] = { marked: true, dotColor: colors.accent };
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: colors.accent };
    return m;
  }, [sections, selected]);

  const addAllToDeviceCalendar = useCallback(async () => {
    if (!deviceCalendarId) return;
    for (const s of sessions) {
      const label = s.mode ? s.mode[0].toUpperCase() + s.mode.slice(1) : 'Session';
      const who = s.clients?.name ? ` · ${s.clients.name}` : '';
      await Calendar.createEventAsync(deviceCalendarId, {
        title: `FitTrack: ${label}${who}`,
        startDate: new Date(s.start_at),
        endDate: new Date(s.end_at || dayjs(s.start_at).add(1, 'hour').toDate()),
        notes: `Status: ${s.status}`,
      });
      const trigger = dayjs(s.start_at).subtract(60, 'minute').toDate();
      if (trigger > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Upcoming session', body: `${dayjs(s.start_at).format('HH:mm')} • ${label}${who}` },
          trigger,
        });
      }
    }
    Alert.alert('Calendar', 'Trainer sessions added with reminders.');
  }, [sessions, deviceCalendarId]);

  const dayData = useMemo(
    () => (sections.find(s => s.title === selected)?.data || []),
    [sections, selected]
  );

  return (
    <Screen>
      <H1 style={{ marginBottom: 8 }}>Your Calendar</H1>
      <Button title="Add all to phone calendar" onPress={addAllToDeviceCalendar} />

      <Card style={{ marginTop: 12 }}>
        <RNCalendar
          markedDates={marked}
          onDayPress={(d) => setSelected(d.dateString)}
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            textSectionTitleColor: colors.subtext,
            selectedDayBackgroundColor: colors.accent,
            selectedDayTextColor: '#000',
            arrowColor: colors.accent,
          }}
        />
      </Card>

      <H2 style={{ marginTop: 12 }}>{dayjs(selected).format('YYYY-MM-DD')}</H2>
      <Card style={{ marginTop: 8, padding: 0 }}>
        <SectionList
          sections={[{ title: selected, data: dayData }]}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <View style={{ padding: 14, borderBottomWidth: 1, borderColor: colors.border }}>
              <H2 style={{ fontSize: 16 }}>
                {(item.mode ? item.mode[0].toUpperCase() + item.mode.slice(1) : 'Session')}
                {item.clients?.name ? ` · ${item.clients.name}` : ''}
              </H2>
              <P>
                {dayjs(item.start_at).format('HH:mm')}
                {item.end_at ? ` → ${dayjs(item.end_at).format('HH:mm')}` : ''}
              </P>
              <P>Status: {item.status}</P>
            </View>
          )}
          renderSectionHeader={() => null}
          ListEmptyComponent={<P style={{ padding: 14 }}>No sessions for this day.</P>}
        />
      </Card>
    </Screen>
  );
}
