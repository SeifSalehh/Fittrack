import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, Alert, FlatList, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';

export default function NewSession() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [start, setStart] = useState('10:00');         // 24h
  const [durationMin, setDurationMin] = useState('60');
  const [mode, setMode] = useState('in_person');
  const [loading, setLoading] = useState(false);

  const loadClients = useCallback(async () => {
    const { data: me } = await supabase.auth.getUser();
    const uid = me?.user?.id;
    if (!uid) return;

    let q = supabase.from('clients')
      .select('id, name')
      .eq('trainer_id', uid)
      .order('name');

    if (query) q = q.ilike('name', `%${query}%`);

    const { data, error } = await q;
    if (error) Alert.alert('Load failed', error.message);
    setClients(data ?? []);
  }, [query]);

  useEffect(() => { loadClients(); }, [loadClients]);

  async function save() {
    try {
      if (!clientId) throw new Error('Pick a client');

      // basic validation
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must be YYYY-MM-DD');
      if (!/^\d{2}:\d{2}$/.test(start)) throw new Error('Start must be HH:mm');

      const startAt = dayjs(`${date}T${start}`).toISOString();
      const endAt = dayjs(startAt).add(Number(durationMin || 60), 'minute').toISOString();

      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;

      setLoading(true);
      const { error } = await supabase.from('sessions').insert({
        trainer_id: uid,
        client_id: clientId,
        start_at: startAt,
        end_at: endAt,
        mode,
        status: 'scheduled',
      });
      if (error) throw error;

      Alert.alert('Saved', 'Session created');
      router.back(); // return to previous screen (Dashboard)
    } catch (e) {
      Alert.alert('Could not save', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <H1>New Session</H1>

      <Card style={{ marginTop: 12, gap: 12 }}>
        <H2>Search Client</H2>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type name…"
          placeholderTextColor={colors.subtext}
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            borderWidth: 1, borderColor: colors.border,
            padding: 12, borderRadius: 14
          }}
        />

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <FlatList
            data={clients}
            keyExtractor={(c) => String(c.id)}
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setClientId(item.id)}
                style={{
                  padding: 12,
                  backgroundColor: clientId === item.id ? colors.surface : colors.bg,
                  borderBottomWidth: 1, borderBottomColor: colors.border
                }}>
                <P style={{ color: colors.text }}>
                  {item.name} (#{item.id}) {clientId === item.id ? '✓' : ''}
                </P>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<P style={{ padding: 12 }}>No clients found.</P>}
          />
        </Card>

        <H2>Schedule</H2>

        <View style={{ gap: 10 }}>
          <P>Date (YYYY-MM-DD)</P>
          <TextInput
            value={date}
            onChangeText={setDate}
            style={{
              backgroundColor: colors.surface, color: colors.text,
              borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 14
            }}
          />

          <P>Start (HH:mm)</P>
          <TextInput
            value={start}
            onChangeText={setStart}
            style={{
              backgroundColor: colors.surface, color: colors.text,
              borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 14
            }}
          />

          <P>Duration (min)</P>
          <TextInput
            value={durationMin}
            onChangeText={setDurationMin}
            keyboardType="numeric"
            style={{
              backgroundColor: colors.surface, color: colors.text,
              borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 14
            }}
          />
        </View>

        <H2>Mode</H2>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title={mode === 'in_person' ? 'In Person ✓' : 'In Person'}
            onPress={() => setMode('in_person')}
          />
          <Button
            title={mode === 'online' ? 'Online ✓' : 'Online'}
            onPress={() => setMode('online')}
          />
        </View>

        <Button title={loading ? 'Saving…' : 'Save'} onPress={save} disabled={loading} />
      </Card>
    </Screen>
  );
}
