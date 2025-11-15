import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  SectionList,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { Screen, H2, P, colors, Button, Card } from '../../../components/UI';
import SessionCard from '../../../components/SessionCard';

export default function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedSession, setSelectedSession] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetAnim = useState(() => new Animated.Value(0))[0];

  const router = useRouter();
  const navigation = useNavigation();
  const now = dayjs();

  // FAB animation state
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // force-remove any headerRight "+" that might come from parent
  useEffect(() => {
    navigation.setOptions({
      title: 'Sessions',
      headerRight: () => null,
    });
  }, [navigation]);

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);
    Animated.spring(fabAnim, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();
  };

  const handleFabAddSession = () => {
    toggleFab();
    router.push('/trainer/sessions/new');
  };

  const handleFabAddPayment = () => {
    toggleFab();
    Alert.alert(
      'Coming soon',
      'From here you’ll be able to add a payment linked to a session.'
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, title, start_at, end_at, status, mode, client_id, clients(name), trainer_id'
        )
        .eq('trainer_id', uid)
        .order('start_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      setSessions(data || []);
    } catch (e) {
      console.error('load sessions error', e);
      Alert.alert('Error', 'Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // realtime scoped to this trainer
  useEffect(() => {
    let channel;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel('sessions-tab')
        .on(
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `trainer_id=eq.${uid}`,
          },
          (payload) => {
            console.log('sessions ▶️', payload);
            load();
          }
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const sections = useMemo(() => {
    const upcoming = [];
    const completed = [];

    for (const s of sessions) {
      const status = s.status || 'scheduled';
      const end = s.end_at ? dayjs(s.end_at) : null;
      const isCompleted =
        status === 'completed' || (end && end.isBefore(now));
      (isCompleted ? completed : upcoming).push(s);
    }

    upcoming.sort(
      (a, b) =>
        dayjs(a.start_at).valueOf() - dayjs(b.start_at).valueOf()
    );
    completed.sort(
      (a, b) =>
        dayjs(b.end_at || b.start_at).valueOf() -
        dayjs(a.end_at || a.start_at).valueOf()
    );

    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Completed', data: completed },
    ];
  }, [sessions, now]);

  // --- status helpers ---
  const updateStatus = async (sessionId, nextStatus) => {
    try {
      await supabase
        .from('sessions')
        .update({ status: nextStatus })
        .eq('id', sessionId);
      await load();
      if (selectedSession?.id === sessionId) {
        setSelectedSession((prev) =>
          prev ? { ...prev, status: nextStatus } : prev
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update status.');
    }
  };

  const handleComplete = async (sessionId) => {
    await updateStatus(sessionId, 'completed');
  };

  // ---- bottom sheet helpers ----
  const openSheet = (session) => {
    setSelectedSession(session);
    setSheetVisible(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSheetVisible(false);
        setSelectedSession(null);
      }
    });
  };

  const handleViewClient = () => {
    if (!selectedSession?.client_id) return;
    router.push({
      pathname: '/trainer/clients/[id]',
      params: { id: selectedSession.client_id },
    });
    closeSheet();
  };

  const handleMarkCompletedFromSheet = async () => {
    if (!selectedSession) return;
    await updateStatus(selectedSession.id, 'completed');
  };

  const handleSetScheduled = async () => {
    if (!selectedSession) return;
    await updateStatus(selectedSession.id, 'scheduled');
  };

  const handleSetPending = async () => {
    if (!selectedSession) return;
    // DB value "pending", UI text "Awaiting confirmation"
    await updateStatus(selectedSession.id, 'pending');
  };

  const handleRescheduleFromSheet = () => {
    if (!selectedSession) return;

    // Navigate to Calendar with reschedule mode
    router.push({
      pathname: '/trainer/calendar',
      params: { rescheduleSessionId: selectedSession.id },
    });

    // Close the bottom sheet
    closeSheet();
  };

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={{ marginTop: 14, marginBottom: 8, paddingHorizontal: 2 }}>
      <H2>{title}</H2>
      {data.length === 0 ? (
        <Card style={{ marginTop: 8 }}>
          <P>No {title.toLowerCase()} sessions.</P>
        </Card>
      ) : null}
    </View>
  );

  const renderItem = ({ item }) => {
    const isDone =
      item.status === 'completed' ||
      (item.end_at && dayjs(item.end_at).isBefore(now));

    return (
      <Pressable
        onPress={() => openSheet(item)}
        style={{ marginBottom: 10 }}
      >
        <SessionCard
          title={item.title}
          clientName={item.clients?.name}
          mode={item.mode}
          startAt={item.start_at}
          endAt={item.end_at}
          status={item.status || 'scheduled'}
          isPaid={!!item.is_paid}
          showComplete={!isDone}
          onComplete={() => handleComplete(item.id)}
        />
      </Pressable>
    );
  };

  const keyExtractor = (item) => String(item.id);

  // formatting helpers for the sheet
  const formatDate = (iso) =>
    iso ? dayjs(iso).format('ddd, D MMM') : '';
  const formatTimeRange = (start, end) => {
    if (!start) return '';
    const startStr = dayjs(start).format('HH:mm');
    const endStr = end ? dayjs(end).format('HH:mm') : '';
    return endStr ? `${startStr} → ${endStr}` : startStr;
  };

  const modeLabel = (mode) => {
    if (!mode) return '';
    if (mode === 'in_person' || mode === 'in-person') return 'In person';
    if (mode === 'online') return 'Online';
    return mode;
  };

  const statusPretty = (status) => {
    if (!status) return '';
    if (status === 'pending') return 'Awaiting confirmation';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  // FAB animations
  const fabRotate = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'], // + to X
  });

  const addSessionTranslateY = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const addPaymentTranslateY = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const fabChildrenOpacity = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Screen style={{ paddingTop: 8 }}>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        refreshing={loading}
        onRefresh={load}
        ListFooterComponent={
          <View style={{ marginTop: 12 }}>
            <Button
              title={loading ? 'Refreshing…' : 'Refresh'}
              onPress={load}
            />
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              marginTop: 32,
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              No sessions yet
            </Text>
            <P>
              Tap the + button below to create your first session.
            </P>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }} // room for FAB stack
      />

      {/* Floating FAB stack */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {/* Add payment mini FAB */}
        <Animated.View
          style={[
            styles.miniFabContainer,
            {
              transform: [{ translateY: addPaymentTranslateY }],
              opacity: fabChildrenOpacity,
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable style={styles.miniFab} onPress={handleFabAddPayment}>
            <Ionicons name="card" size={18} color="#000" />
          </Pressable>
          <Text style={styles.miniFabLabel}>Add payment</Text>
        </Animated.View>

        {/* Add session mini FAB */}
        <Animated.View
          style={[
            styles.miniFabContainer,
            {
              transform: [{ translateY: addSessionTranslateY }],
              opacity: fabChildrenOpacity,
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable style={styles.miniFab} onPress={handleFabAddSession}>
            <Ionicons name="calendar-outline" size={18} color="#000" />
          </Pressable>
          <Text style={styles.miniFabLabel}>Add session</Text>
        </Animated.View>

        {/* Main FAB */}
        <Pressable onPress={toggleFab} style={styles.fab}>
          <Animated.View style={{ transform: [{ rotate: fabRotate }] }}>
            <Ionicons name="add" size={30} color="#000" />
          </Animated.View>
        </Pressable>
      </View>

      {/* Slide-up session detail popup */}
      {sheetVisible && selectedSession && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={closeSheet} />

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={{ gap: 4, marginBottom: 12 }}>
              <Text style={styles.sheetTitle}>
                {selectedSession.clients?.name ||
                  selectedSession.title ||
                  'Session'}
              </Text>
              <Text style={styles.sheetMeta}>
                {modeLabel(selectedSession.mode)} •{' '}
                {statusPretty(selectedSession.status || 'scheduled')}
              </Text>
              <Text style={styles.sheetMeta}>
                {formatDate(selectedSession.start_at)}
              </Text>
              <Text style={styles.sheetMeta}>
                {formatTimeRange(
                  selectedSession.start_at,
                  selectedSession.end_at
                )}
              </Text>
              {selectedSession.is_paid && (
                <Text style={styles.sheetMeta}>
                  Payment:{' '}
                  <Text style={{ fontWeight: '600' }}>Paid</Text>
                </Text>
              )}
            </View>

            {/* Status controls */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.sheetMeta, { marginBottom: 6 }]}>
                Status
              </Text>
              <View style={styles.statusRow}>
                <Button
                  title="Scheduled"
                  variant={
                    (selectedSession.status || 'scheduled') ===
                    'scheduled'
                      ? 'primary'
                      : 'outline'
                  }
                  onPress={handleSetScheduled}
                  style={styles.statusBtn}
                />
                <Button
                  title="Completed"
                  variant={
                    selectedSession.status === 'completed'
                      ? 'primary'
                      : 'outline'
                  }
                  onPress={handleMarkCompletedFromSheet}
                  style={styles.statusBtn}
                />
                <Button
                  title="Awaiting"
                  variant={
                    selectedSession.status === 'pending'
                      ? 'primary'
                      : 'outline'
                  }
                  onPress={handleSetPending}
                  style={styles.statusBtn}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Button
                title="View client profile"
                variant="outline"
                onPress={handleViewClient}
              />
              <Button
                title="Reschedule session"
                variant="outline"
                onPress={handleRescheduleFromSheet}
              />

              <Button
                title={
                  selectedSession?.is_paid ? 'Already paid' : 'Add payment'
                }
                variant={selectedSession?.is_paid ? 'outline' : 'solid'}
                disabled={!!selectedSession?.is_paid}
                onPress={() => {
                  if (!selectedSession) return;
                  if (selectedSession.is_paid) return;

                  router.push({
                    pathname: '/trainer/payments/new',
                    params: {
                      sessionId: selectedSession.id,
                      clientId: selectedSession.client_id,
                      // amount: selectedSession.price ?? '0', // later if you add price
                    },
                  });

                  closeSheet();
                }}
              />

              <Button
                title="Close"
                variant="ghost"
                onPress={closeSheet}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface || '#111111',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#444',
    marginBottom: 10,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetMeta: {
    color: colors.muted || '#aaa',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary || '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  miniFabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    alignItems: 'flex-end',
  },
  miniFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface || '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniFabLabel: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    marginRight: 4,
  },
});
