// app/trainer/(tabs)/index.jsx
import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { router, Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';
import DonutRevenueMinimal from '../../../components/DonutRevenueMinimal';

export default function TrainerHome() {
  const [todaySessions, setTodaySessions] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(1000); // TODO: fetch per-trainer

  const getUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const user = await getUser();
      if (!user) return;

      const startISO = dayjs().startOf('day').toISOString();
      const endISO   = dayjs().endOf('day').toISOString();

      // Today’s sessions
      const { data: sess, error: e1 } = await supabase
        .from('sessions')
        .select('id, start_at, end_at, status, client_id, package_id, trainer_id')
        .eq('trainer_id', user.id)
        .gte('start_at', startISO)
        .lt('start_at', endISO)
        .order('start_at', { ascending: true });
      if (e1) throw e1;
      setTodaySessions(sess ?? []);

      // Month revenue
      const mStart = dayjs().startOf('month').toISOString();
      const mEnd   = dayjs().endOf('month').toISOString();
      const { data: pays, error: e2 } = await supabase
        .from('payments')
        .select('amount, paid_at, trainer_id')
        .eq('trainer_id', user.id)
        .gte('paid_at', mStart)
        .lt('paid_at', mEnd);
      if (e2) throw e2;
      setRevenue((pays ?? []).reduce((s, p) => s + Number(p.amount || 0), 0));

      // Client count
      const { count, error: e3 } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', user.id);
      if (e3) throw e3;
      setClientCount(count ?? 0);
    } catch (err) {
      Alert.alert('Load error', err.message ?? String(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // realtime re-fetch for this trainer’s sessions + log payload
  useEffect(() => {
    let channel;
    (async () => {
      const user = await getUser();
      if (!user) return;
      channel = supabase
        .channel('trainer-sessions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `trainer_id=eq.${user.id}` },
          (payload) => {
            console.log('sessions change ▶️', payload);
            load();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime subscribed to trainer sessions');
          }
        });
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  async function completeSession(sessionId, clientId) {
    try {
      const { data: packs, error: pErr } = await supabase
        .from('packages')
        .select('id, sessions_total, sessions_used, status')
        .eq('client_id', clientId)
        .eq('status', 'active');
      if (pErr) throw pErr;

      const active = (packs ?? []).find(p => (p.sessions_total - p.sessions_used) > 0);

      const updates = { status: 'completed' };
      if (active) updates.package_id = active.id;

      const { error: sErr } = await supabase.from('sessions').update(updates).eq('id', sessionId);
      if (sErr) throw sErr;

      if (active) {
        const { error: uErr } = await supabase
          .from('packages')
          .update({ sessions_used: active.sessions_used + 1 })
          .eq('id', active.id);
        if (uErr) throw uErr;
      }

      Alert.alert('Done', 'Session marked completed.');
      load();
    } catch (e) {
      Alert.alert('Complete failed', e.message ?? String(e));
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/sign-in');
  }

  return (
    <Screen>
      {/* Header + quick actions */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <H1>Trainer Dashboard</H1>
        <Button title="Log out" variant="outline" onPress={logout} />
      </View>

      <Card style={{ marginBottom: 12 }}>
        <H2>Quick Actions</H2>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
          <Link href="/trainer/sessions/new" asChild><Button title="Add Session" /></Link>
          <Link href="/trainer/finances" asChild><Button title="Finances" /></Link>
          <Link href="/trainer/(tabs)/calendar" asChild><Button title="Calendar" /></Link>
          <Link href="/trainer/clients" asChild><Button title="Clients" /></Link>
        </View>
      </Card>

      {/* KPIs: Clients + Monthly revenue (minimal donut) */}
      <View style={{ flexDirection:'row', gap:12, marginBottom: 12 }}>
        <Card style={{ flex:1, minHeight: 170, justifyContent: 'center' }}>
          <H2>Clients</H2>
          <P style={{ fontSize:32, color: colors.text, marginTop: 8 }}>{clientCount}</P>
        </Card>

        <Card style={{ flex:1, minHeight: 170, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
          <H2 style={{ marginBottom: 8 }}>Monthly revenue</H2>
          <DonutRevenueMinimal
            value={revenue}
            goal={monthlyGoal}
            currency="€"
            size={140}
            strokeWidth={12}
            trackColor={colors.border}
            textColor={colors.text}
          />
        </Card>
      </View>

      {/* Today’s sessions */}
      <H2>Today’s Sessions</H2>
      <Card style={{ marginTop:8, padding:0 }}>
        <FlatList
          data={todaySessions}
          keyExtractor={(x) => String(x.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={{ padding:14, borderBottomWidth:1, borderColor: colors.border, gap:6 }}>
              <H2 style={{ fontSize:16 }}>
                {dayjs(item.start_at).format('HH:mm')} — Client #{item.client_id}
              </H2>
              <P>Status: {item.status}{item.package_id ? ' (package)' : ''}</P>
              {item.status !== 'completed' && (
                <Button title="Complete" onPress={() => completeSession(item.id, item.client_id)} />
              )}
            </View>
          )}
          ListEmptyComponent={<P style={{ padding:14 }}>No sessions today.</P>}
        />
      </Card>
    </Screen>
  );
}
