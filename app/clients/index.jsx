import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../components/UI';

export default function ClientHome() {
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setMessage('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/sign-in'); return; }

      const { data: c, error: cErr, status } = await supabase
        .from('clients')
        .select('id, name, email, trainer_id')
        .eq('client_user_id', user.id)
        .maybeSingle();
      if (cErr && status !== 406) throw cErr;
      setClient(c ?? null);

      if (!c) { setSessions([]); setPackages([]); setPayments([]); return; }

      const nowISO = new Date().toISOString();
      const [{ data: s, error: sErr }, { data: pk, error: pkErr }, { data: pay, error: pErr }] =
        await Promise.all([
          supabase.from('sessions')
            .select('id, start_at, end_at, status, mode, title')
            .eq('client_id', c.id)
            .gte('start_at', nowISO)
            .order('start_at', { ascending: true }),
          supabase.from('packages')
            .select('id, name, sessions_total, sessions_used, status, expires_on, created_at')
            .eq('client_id', c.id)
            .order('created_at', { ascending: false }),
          supabase.from('payments')
            .select('id, amount, currency, paid_at, method, sessions_purchased')
            .eq('client_id', c.id)
            .order('paid_at', { ascending: false })
        ]);
      if (sErr) throw sErr; if (pkErr) throw pkErr; if (pErr) throw pErr;

      setSessions(s ?? []); setPackages(pk ?? []); setPayments(pay ?? []);
    } catch (e) {
      Alert.alert('Load error', e?.message ?? String(e));
    } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => { await supabase.auth.signOut(); router.replace('/auth/sign-in'); };
  const fixLink = useCallback(async () => {
    try { setLinking(true); setMessage('Linking…'); await supabase.rpc('client_self_link'); await load(); setMessage('Linked!'); }
    finally { setLinking(false); }
  }, [load]);

  if (!client) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <H1>No client profile linked</H1>
        <P style={{ marginTop: 6 }}>
          If your trainer already added your email, tap “Fix link” once.
        </P>
        {message ? <P style={{ marginTop: 6 }}>{message}</P> : null}
        <Button title={linking ? 'Linking…' : 'Fix link'} onPress={fixLink} disabled={linking} />
        <Button title="Refresh" variant="outline" onPress={load} />
        <Button title="Log out" variant="outline" onPress={logout} />
      </Screen>
    );
  }

  const active = packages.find(p => p.status === 'active');
  const remaining = active ? Math.max(0, (active.sessions_total || 0) - (active.sessions_used || 0)) : null;

  return (
    <Screen>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <H1>Hi {client.name || 'there'}</H1>
        <Button title="Log out" variant="outline" onPress={logout} />
      </View>

      {active && (
        <Card style={{ marginBottom: 12 }}>
          <H2>Active package: {active.name}</H2>
          <P>Remaining: {remaining}</P>
          {active.expires_on && <P>Expires: {dayjs(active.expires_on).format('YYYY-MM-DD')}</P>}
        </Card>
      )}

      <H2>Upcoming Sessions</H2>
      <Card style={{ marginTop: 8, padding: 0 }}>
        <FlatList
          data={sessions}
          keyExtractor={s => String(s.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={{ padding: 14, borderBottomWidth: 1, borderColor: colors.border }}>
              <H2 style={{ fontSize: 16 }}>{item.title || (item.mode || 'Session')}</H2>
              <P>{dayjs(item.start_at).format('YYYY-MM-DD HH:mm')}
                 {item.end_at ? ` → ${dayjs(item.end_at).format('HH:mm')}` : ''}</P>
              <P>Status: {item.status}</P>
            </View>
          )}
          ListEmptyComponent={<P style={{ padding: 14 }}>No upcoming sessions.</P>}
        />
      </Card>

      <H2 style={{ marginTop: 12 }}>Recent Payments</H2>
      <Card style={{ marginTop: 8, padding: 0 }}>
        <FlatList
          data={payments}
          keyExtractor={p => String(p.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={{ padding: 14, borderBottomWidth: 1, borderColor: colors.border }}>
              <H2 style={{ fontSize: 16 }}>{Number(item.amount || 0).toFixed(2)} {item.currency || ''}</H2>
              <P>{dayjs(item.paid_at).format('YYYY-MM-DD')}</P>
              {!!item.method && <P>Method: {item.method}</P>}
              <P>Sessions purchased: {item.sessions_purchased ?? 0}</P>
            </View>
          )}
          ListEmptyComponent={<P style={{ padding: 14 }}>No payments yet.</P>}
        />
      </Card>
    </Screen>
  );
}
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------