// app/trainer/clients/index.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, FlatList, TextInput, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { supabase } from '../../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user?.id ?? null;
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const uid = await getUserId();
      if (!uid) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, goals, client_user_id, created_at')
        .eq('trainer_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (e) {
      Alert.alert('Load failed', e.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let channel;
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      channel = supabase
        .channel('rt-trainer-clients')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `trainer_id=eq.${uid}`,
        }, () => load())
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  const inputStyle = {
    backgroundColor: colors.surface, color: colors.text,
    borderColor: colors.border, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 6
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
  }, [q, clients]);

  const LinkBadge = ({ linked }) => (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
      backgroundColor: linked ? colors.accent : 'transparent',
      borderWidth: linked ? 0 : 1, borderColor: colors.border
    }}>
      <H2 style={{ fontSize: 12, color: linked ? '#000' : colors.text }}>
        {linked ? 'Linked ✓' : 'Not linked'}
      </H2>
    </View>
  );

  return (
    <Screen>
      <H1>Clients</H1>

      <View style={{ marginTop: 8, marginBottom: 4 }}>
        <TextInput
          placeholder="Search by name or email"
          placeholderTextColor={colors.subtext}
          value={q}
          onChangeText={setQ}
          style={inputStyle}
        />
      </View>

      <Link href="/trainer/clients/new" asChild>
        <Button title="Add Client" />
      </Link>

      <Card style={{ marginTop: 12, padding: 0 }}>
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          refreshing={refreshing}
          onRefresh={load}
          renderItem={({ item }) => (
            <View style={{ padding: 14, borderBottomWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <H2 style={{ fontSize: 16 }}>{item.name || item.email || 'Unnamed client'}</H2>
                <LinkBadge linked={!!item.client_user_id} />
              </View>

              {!!item.email && <P>{item.email}</P>}
              {!!item.goals && <P>Goals: {item.goals}</P>}
              <P>Joined: {dayjs(item.created_at).format('YYYY-MM-DD')}</P>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <Link
                  href={{ pathname: '/trainer/sessions/new', params: { clientId: item.id } }}
                  asChild
                >
                  <Button title="Add Session" />
                </Link>

                <Link
                  href={{ pathname: '/trainer/finances', params: { clientId: item.id } }}
                  asChild
                >
                  <Button title="Record Payment" variant="outline" />
                </Link>

                <Link
                  href={{
                    pathname: '/trainer/clients/link-client',
                    params: { clientId: item.id, presetEmail: item.email || '' },
                  }}
                  asChild
                >
                  <Button title={item.client_user_id ? 'Relink' : 'Link by email'} variant={item.client_user_id ? 'outline' : 'solid'} />
                </Link>
              </View>
            </View>
          )}
          ListEmptyComponent={<P style={{ padding: 14 }}>No clients yet. Add one.</P>}
        />
      </Card>
    </Screen>
  );
}
