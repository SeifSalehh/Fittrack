// app/trainer/(tabs)/sessions.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, SectionList, Text } from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Screen, H2, P, colors, Button, Card } from '../../../components/UI';
import SessionCard from '../../../components/SessionCard';

export default function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, start_at, end_at, status, mode, client_id, clients(name), trainer_id')
        .eq('trainer_id', uid)
        .order('start_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      setSessions(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // realtime subscribe scoped to this trainer
  useEffect(() => {
    let channel;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel('sessions-tab')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `trainer_id=eq.${uid}` },
          (payload) => { console.log('sessions ▶️', payload); load(); }
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  const now = dayjs();
  const sections = useMemo(() => {
    const upcoming = [];
    const completed = [];

    for (const s of sessions) {
      const status = s.status || 'scheduled';
      const end = s.end_at ? dayjs(s.end_at) : null;
      const isCompleted = status === 'completed' || (end && end.isBefore(now));
      (isCompleted ? completed : upcoming).push(s);
    }

    upcoming.sort((a, b) => dayjs(a.start_at).valueOf() - dayjs(b.start_at).valueOf());
    completed.sort((a, b) =>
      dayjs(b.end_at || b.start_at).valueOf() - dayjs(a.end_at || a.start_at).valueOf()
    );

    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Completed', data: completed },
    ];
  }, [sessions, now]);

  const handleComplete = async (sessionId) => {
    // minimal optimistic completion; your business logic can be added
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
    load();
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
    const isDone = item.status === 'completed' ||
      (item.end_at && dayjs(item.end_at).isBefore(now));
    return (
      <View style={{ marginBottom: 10 }}>
        <SessionCard
          title={item.title}
          mode={item.mode}
          clientName={item.clients?.name}
          startAt={item.start_at}
          endAt={item.end_at}
          status={item.status || 'scheduled'}
          showComplete={!isDone}
          onComplete={() => handleComplete(item.id)}
        />
      </View>
    );
  };

  return (
    <Screen style={{ paddingTop: 8 }}>
      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        refreshing={loading}
        onRefresh={load}
        ListFooterComponent={
          <View style={{ marginTop: 12 }}>
            <Button title={loading ? 'Refreshing…' : 'Refresh'} onPress={load} />
          </View>
        }
        ListEmptyComponent={
          <View style={{ marginTop: 32, alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>No sessions yet</Text>
            <P>Tap “Add Session” from the Dashboard to create your first one.</P>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}
