// app/trainer/(tabs)/calendar.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Platform,
  View,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Calendar as RNCalendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';

export default function TrainerCalendar() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(dayjs().format('YYYY-MM-DD'));
  const [deviceCalendarId, setDeviceCalendarId] = useState(null);

  // view mode: 'day' | 'week' | 'month'
  const [viewMode, setViewMode] = useState('week');
  const [viewPickerOpen, setViewPickerOpen] = useState(false);

  // tapped session → for popup
  const [selectedSession, setSelectedSession] = useState(null);

  // animation values for popup
  const popupAnim = useMemo(() => new Animated.Value(0), []);
  const backdropAnim = useMemo(() => new Animated.Value(0), []);

  // ─────────────────────────────────────
  // Reschedule via URL param
  // ─────────────────────────────────────
  const router = useRouter();
  const { rescheduleSessionId } = useLocalSearchParams();
  const rescheduleId = rescheduleSessionId ? String(rescheduleSessionId) : null;
  const isRescheduling = !!rescheduleId;

  // ─────────────────────────────────────
  // Load sessions for this trainer
  // ─────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('id, start_at, end_at, status, mode, client_id, clients(name)')
        .eq('trainer_id', user.id)
        .order('start_at', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      Alert.alert('Load error', err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ─────────────────────────────────────
  // Device calendar + notifications setup
  // ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status: cStatus } = await Calendar.requestCalendarPermissionsAsync();
      const { status: nStatus } = await Notifications.requestPermissionsAsync();
      if (cStatus !== 'granted') Alert.alert('Calendar permission needed');
      if (nStatus !== 'granted') Alert.alert('Notification permission needed');

      const all = await Calendar.getCalendarsAsync();
      const existing = all.find((c) => c.title === 'FitTrack (Trainer)');
      if (existing) {
        setDeviceCalendarId(existing.id);
        return;
      }

      const src =
        Platform.OS === 'ios'
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

  const addAllToDeviceCalendar = useCallback(async () => {
    if (!deviceCalendarId) return;
    for (const s of sessions) {
      const label = s.mode ? s.mode[0].toUpperCase() + s.mode.slice(1) : 'Session';
      const who = s.clients?.name ? ` · ${s.clients.name}` : '';
      await Calendar.createEventAsync(deviceCalendarId, {
        title: `FitTrack: ${label}${who}`,
        startDate: new Date(s.start_at),
        endDate: new Date(
          s.end_at || dayjs(s.start_at).add(1, 'hour').toDate()
        ),
        notes: `Status: ${s.status}`,
      });
      const trigger = dayjs(s.start_at).subtract(60, 'minute').toDate();
      if (trigger > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Upcoming session',
            body: `${dayjs(s.start_at).format('HH:mm')} • ${label}${who}`,
          },
          trigger,
        });
      }
    }
    Alert.alert('Calendar', 'Trainer sessions added with reminders.');
  }, [sessions, deviceCalendarId]);

  // ─────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const d = dayjs(s.start_at).format('YYYY-MM-DD');
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [sessions]);

  const daySessions = useMemo(
    () => sessionsByDate[selected] || [],
    [sessionsByDate, selected]
  );

  // Week days for the strip (Sun–Sat based on selected)
  const weekDays = useMemo(() => {
    const selectedObj = dayjs(selected);
    const dayIdx = selectedObj.day(); // 0–6
    const startOfWeek = selectedObj.subtract(dayIdx, 'day'); // Sunday start
    return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
  }, [selected]);

  // Month marking for month view
  const markedDates = useMemo(() => {
    const marked = {};
    Object.keys(sessionsByDate).forEach((date) => {
      marked[date] = {
        ...(marked[date] || {}),
        marked: true,
        dotColor: colors.accent,
      };
    });
    marked[selected] = {
      ...(marked[selected] || {}),
      selected: true,
      selectedColor: colors.accent,
      selectedTextColor: '#000',
    };
    return marked;
  }, [sessionsByDate, selected]);

  // Summary chips (count, hours, revenue placeholder)
  const selectedSummary = useMemo(() => {
    const count = daySessions.length;
    let totalMinutes = 0;

    for (const s of daySessions) {
      const start = dayjs(s.start_at);
      const end = s.end_at ? dayjs(s.end_at) : start.add(1, 'hour');
      totalMinutes += end.diff(start, 'minute');
    }

    const totalHours = totalMinutes / 60;
    const revenue = 0; // placeholder

    return {
      count,
      hoursLabel: totalHours ? `${totalHours.toFixed(1)}h total` : '0h',
      revenueLabel: `€${revenue.toFixed(0)}`,
    };
  }, [daySessions]);

  const isToday = selected === dayjs().format('YYYY-MM-DD');

  // ─────────────────────────────────────
  // Day view timeline config
  // ─────────────────────────────────────
  const dayStartHour = 6;
  const dayEndHour = 22;
  const rowHeight = 48;

  const hoursRange = useMemo(
    () =>
      Array.from(
        { length: dayEndHour - dayStartHour + 1 },
        (_, i) => dayStartHour + i
      ),
    []
  );

  const minuteHeight = rowHeight / 60;
  const dayWindowMinutes = (dayEndHour - dayStartHour) * 60;

  // ─────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────
  const handleSelectDay = (dateString) => {
    setSelected(dateString);
  };

  const handleNewSession = () => {
    // navigate to add session screen
    router.push('/trainer/sessions/new');
  };

  const shiftWeek = (direction) => {
    const newSelected = dayjs(selected).add(direction * 7, 'day');
    setSelected(newSelected.format('YYYY-MM-DD'));
  };

  const shiftDay = (direction) => {
    const newSelected = dayjs(selected).add(direction, 'day');
    setSelected(newSelected.format('YYYY-MM-DD'));
  };

  const toggleViewPicker = () => setViewPickerOpen((prev) => !prev);

  const handleChangeView = (mode) => {
    setViewMode(mode);
    setViewPickerOpen(false);
  };

  const viewLabel =
    viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month';

  const openSessionPopup = (session) => {
    setSelectedSession(session);
    Animated.parallel([
      Animated.timing(popupAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSessionPopup = () => {
    Animated.parallel([
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedSession(null);
    });
  };

  // 🔁 Reschedule handler: move session to selected day + chosen hour
  const handleRescheduleToHour = async (hour24) => {
    if (!isRescheduling) return;

    try {
      const base = dayjs(selected)
        .hour(hour24)
        .minute(0)
        .second(0)
        .millisecond(0);

      // disallow rescheduling into the past
      if (base.isBefore(dayjs())) {
        Alert.alert('Invalid time', 'You cannot reschedule to a past time.');
        return;
      }

      const newStart = base.toISOString();
      const newEnd = base.add(1, 'hour').toISOString();

      const { error } = await supabase
        .from('sessions')
        .update({
          start_at: newStart,
          end_at: newEnd,
        })
        .eq('id', rescheduleId);

      if (error) throw error;

      Alert.alert(
        'Session rescheduled',
        `Moved to ${base.format('ddd, D MMM HH:mm')}`
      );

      // go back to the previous screen (likely Sessions tab)
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not reschedule session.');
    }
  };

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────
  return (
    <Screen style={{ paddingTop: 8 }}>
      {/* Scroll entire content so tall day view can scroll */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }}>
        {/* Header row: left title, right view dropdown */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <H1 style={{ marginBottom: 4 }}>Calendar</H1>
            <P>
              {isToday
                ? `Today · ${dayjs(selected).format('ddd, D MMM')}`
                : dayjs(selected).format('dddd, D MMM')}
            </P>
          </View>

          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={toggleViewPicker}
              style={({ pressed }) => [
                {
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <P style={{ fontSize: 12, marginRight: 4 }}>{viewLabel} view</P>
              <P style={{ fontSize: 12 }}>▾</P>
            </Pressable>

            {viewPickerOpen && (
              <Card
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 0,
                  paddingVertical: 4,
                  width: 130,
                  zIndex: 20,
                  elevation: 20,
                }}
              >
                {['day', 'week', 'month'].map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => handleChangeView(mode)}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor:
                          viewMode === mode ? colors.accentDim : 'transparent',
                        marginVertical: 2,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <P
                      style={{
                        fontSize: 13,
                        color: viewMode === mode ? colors.text : colors.subtext,
                      }}
                    >
                      {mode === 'day'
                        ? 'Day view'
                        : mode === 'week'
                        ? 'Week view'
                        : 'Month view'}
                    </P>
                  </Pressable>
                ))}
              </Card>
            )}
          </View>
        </View>

        {/* Reschedule banner */}
        {isRescheduling && (
          <Card
            style={{
              marginTop: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <P style={{ fontSize: 13, fontWeight: '600' }}>
              Rescheduling session
            </P>
            <P style={{ fontSize: 12, marginTop: 2, color: colors.subtext }}>
              Switch to Day view and tap a time slot to move this session.
            </P>
          </Card>
        )}

        {/* Mini summary chips */}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              marginRight: 8,
            }}
          >
            <P style={{ fontSize: 12 }}>{selectedSummary.count} sessions</P>
          </View>
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              marginRight: 8,
            }}
          >
            <P style={{ fontSize: 12 }}>{selectedSummary.hoursLabel}</P>
          </View>
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <P style={{ fontSize: 12 }}>{selectedSummary.revenueLabel}</P>
          </View>
        </View>

        {/* Sync with device calendar */}
        <View style={{ marginTop: 10 }}>
          <Button
            title="Sync with phone calendar"
            onPress={addAllToDeviceCalendar}
            variant="outline"
          />
        </View>

        {/* DAY VIEW: arrow navigation + hour timeline */}
        {viewMode === 'day' && (
          <>
            {/* Header arrows */}
            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable onPress={() => shiftDay(-1)} style={{ padding: 6 }}>
                <P style={{ fontSize: 18 }}>{'‹'}</P>
              </Pressable>
              <P style={{ fontSize: 13 }}>
                {dayjs(selected).format('ddd, D MMM YYYY')}
              </P>
              <Pressable onPress={() => shiftDay(1)} style={{ padding: 6 }}>
                <P style={{ fontSize: 18 }}>{'›'}</P>
              </Pressable>
            </View>

            {/* Hour grid */}
            <Card
              style={{
                marginTop: 8,
                paddingHorizontal: 0,
                paddingVertical: 8,
                flexDirection: 'row',
              }}
            >
              {/* Hours column */}
              <View style={{ width: 64 }}>
                {hoursRange.map((h) => (
                  <View
                    key={h}
                    style={{
                      height: rowHeight,
                      justifyContent: 'flex-start',
                      alignItems: 'flex-end',
                      paddingRight: 8,
                    }}
                  >
                    <P style={{ fontSize: 11 }}>
                      {dayjs().hour(h).minute(0).format('HH:mm')}
                    </P>
                  </View>
                ))}
              </View>

              {/* Timeline track */}
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View
                  style={{
                    position: 'relative',
                    height: dayWindowMinutes * minuteHeight,
                  }}
                >
                  {/* Hour grid lines */}
                  {hoursRange.map((h) => (
                    <View
                      key={`line-${h}`}
                      style={{
                        position: 'absolute',
                        top: (h - dayStartHour) * 60 * minuteHeight,
                        left: 0,
                        right: 0,
                        height: 1,
                        backgroundColor: colors.border,
                      }}
                    />
                  ))}

                  {/* Reschedule hit areas (only when rescheduling) */}
                  {isRescheduling &&
                    hoursRange.map((h) => (
                      <Pressable
                        key={`slot-${h}`}
                        onPress={() => handleRescheduleToHour(h)}
                        style={{
                          position: 'absolute',
                          top: (h - dayStartHour) * 60 * minuteHeight,
                          left: 0,
                          right: 0,
                          height: 60 * minuteHeight,
                        }}
                      />
                    ))}

                  {/* Session blocks */}
                  {daySessions.map((s) => {
                    const start = dayjs(s.start_at);
                    const end = s.end_at ? dayjs(s.end_at) : start.add(1, 'hour');
                    const windowStart = dayjs(selected)
                      .hour(dayStartHour)
                      .minute(0)
                      .second(0);

                    let startMinutes = start.diff(windowStart, 'minute');
                    let durationMinutes = end.diff(start, 'minute');

                    startMinutes = Math.max(
                      0,
                      Math.min(startMinutes, dayWindowMinutes)
                    );
                    durationMinutes = Math.max(
                      30,
                      Math.min(durationMinutes, dayWindowMinutes - startMinutes)
                    );

                    const top = startMinutes * minuteHeight;
                    const height = durationMinutes * minuteHeight;

                    const label = s.mode
                      ? s.mode[0].toUpperCase() + s.mode.slice(1)
                      : 'Session';
                    const clientName = s.clients?.name || 'No name';
                    const status = s.status || 'scheduled';

                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => openSessionPopup(s)}
                        disabled={isRescheduling} // prevent conflict with reschedule taps
                        style={{
                          position: 'absolute',
                          top,
                          left: 4,
                          right: 4,
                          height,
                          borderRadius: 12,
                          padding: 6,
                          backgroundColor: colors.accentDim,
                        }}
                      >
                        <P style={{ fontSize: 11, color: colors.text }}>
                          {start.format('HH:mm')} – {end.format('HH:mm')}
                        </P>
                        <H2 style={{ fontSize: 14 }}>{clientName}</H2>
                        <P style={{ fontSize: 11 }}>
                          {label} · {status}
                        </P>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </>
        )}

        {/* WEEK VIEW: week header + strip */}
        {viewMode === 'week' && (
          <>
            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable onPress={() => shiftWeek(-1)} style={{ padding: 6 }}>
                <P style={{ fontSize: 18 }}>{'‹'}</P>
              </Pressable>
              <P style={{ fontSize: 13 }}>
                Week of {weekDays[0].format('D MMM')} –{' '}
                {weekDays[6].format('D MMM')}
              </P>
              <Pressable onPress={() => shiftWeek(1)} style={{ padding: 6 }}>
                <P style={{ fontSize: 18 }}>{'›'}</P>
              </Pressable>
            </View>

            <Card style={{ marginTop: 8, paddingVertical: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {weekDays.map((d) => {
                  const dateString = d.format('YYYY-MM-DD');
                  const isSelectedDay = dateString === selected;
                  const count = sessionsByDate[dateString]?.length || 0;

                  return (
                    <Pressable
                      key={dateString}
                      onPress={() => handleSelectDay(dateString)}
                      style={({ pressed }) => [
                        {
                          width: 56,
                          alignItems: 'center',
                          paddingVertical: 8,
                          marginHorizontal: 4,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: isSelectedDay
                            ? colors.accent
                            : colors.border,
                          backgroundColor: isSelectedDay
                            ? colors.accent
                            : 'transparent',
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <P
                        style={{
                          fontSize: 11,
                          color: isSelectedDay ? '#000' : colors.subtext,
                        }}
                      >
                        {d.format('dd').toUpperCase()}
                      </P>
                      <H2
                        style={{
                          fontSize: 16,
                          marginTop: 2,
                          color: isSelectedDay ? '#000' : colors.text,
                        }}
                      >
                        {d.format('D')}
                      </H2>

                      {/* Density dots */}
                      <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        {Array.from({ length: Math.min(count, 3) }).map(
                          (_, idx) => (
                            <View
                              key={idx}
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: 999,
                                marginHorizontal: 1,
                                backgroundColor: isSelectedDay
                                  ? '#000'
                                  : colors.accent,
                              }}
                            />
                          )
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>
          </>
        )}

        {/* MONTH VIEW: grid calendar */}
        {viewMode === 'month' && (
          <Card style={{ marginTop: 16 }}>
            <RNCalendar
              markedDates={markedDates}
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
        )}

        {/* Agenda list for selected day */}
        <H2 style={{ marginTop: 16 }}>
          Sessions · {dayjs(selected).format('ddd, D MMM')}
        </H2>
        <Card style={{ marginTop: 8, padding: 0 }}>
          {daySessions.length === 0 ? (
            <P style={{ padding: 14 }}>No sessions for this day.</P>
          ) : (
            daySessions.map((item) => {
              const label = item.mode
                ? item.mode[0].toUpperCase() + item.mode.slice(1)
                : 'Session';
              const clientName = item.clients?.name || 'No name';
              const start = dayjs(item.start_at).format('HH:mm');
              const end = item.end_at
                ? dayjs(item.end_at).format('HH:mm')
                : null;
              const status = item.status || 'scheduled';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => openSessionPopup(item)}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <H2 style={{ fontSize: 16 }}>
                    {start}
                    {end ? ` – ${end}` : ''} · {clientName}
                  </H2>
                  <P style={{ marginTop: 2 }}>
                    {label} · {status}
                  </P>
                </Pressable>
              );
            })
          )}
        </Card>
      </ScrollView>

      {/* Floating action button */}
      <View
        style={{
          position: 'absolute',
          right: 16,
          bottom: 24,
        }}
      >
        <Button title="+ New Session" onPress={handleNewSession} />
      </View>

      {/* Session detail popup with slide-up animation */}
      {selectedSession && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)'],
            }),
            justifyContent: 'flex-end',
          }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: popupAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            }}
          >
            <Card
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                paddingBottom: 24,
              }}
            >
              {/* drag handle */}
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: colors.border,
                  }}
                />
              </View>

              {(() => {
                const s = selectedSession;
                const start = dayjs(s.start_at);
                const end = s.end_at ? dayjs(s.end_at) : start.add(1, 'hour');
                const label = s.mode
                  ? s.mode[0].toUpperCase() + s.mode.slice(1)
                  : 'Session';
                const clientName = s.clients?.name || 'No name';
                const status = s.status || 'scheduled';
                const price = 0; // placeholder

                return (
                  <>
                    <H2 style={{ marginBottom: 4 }}>{clientName}</H2>
                    <P>{label}</P>

                    <View style={{ marginTop: 12 }}>
                      <P>
                        {start.format('ddd, D MMM YYYY')} • {start.format(
                          'HH:mm'
                        )}{' '}
                        – {end.format('HH:mm')}
                      </P>
                      <P style={{ marginTop: 4 }}>Status: {status}</P>
                      <P style={{ marginTop: 4 }}>Cost: €{price}</P>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        marginTop: 16,
                      }}
                    >
                      <Button
                        title="Close"
                        variant="outline"
                        onPress={closeSessionPopup}
                      />
                    </View>
                  </>
                );
              })()}
            </Card>
          </Animated.View>
        </Animated.View>
      )}
    </Screen>
  );
}
