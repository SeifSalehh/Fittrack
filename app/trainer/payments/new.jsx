// app/trainer/payments/new.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { supabase } from '../../../lib/supabase';

export default function NewPayment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Params from navigation (when coming from a session bottom sheet)
  const sessionIdParam = params.sessionId ? String(params.sessionId) : null;
  const clientIdParam = params.clientId ? Number(params.clientId) : null;
  const amountParam = params.amount ? String(params.amount) : '';

  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState(clientIdParam);
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState(amountParam || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const [method, setMethod] = useState('cash'); // 'cash' | 'card' | 'transfer' | 'other'

  const [sessionSummary, setSessionSummary] = useState(null);

  // Load clients for search
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const base = supabase
          .from('clients')
          .select('id, name, rate_type, hourly_rate, monthly_rate')
          .order('name');

        const { data, error } = query
          ? await base.ilike('name', `%${query}%`)
          : await base;

        if (error) {
          Alert.alert('Load failed', error.message);
          return;
        }

        if (!isMounted) return;

        setClients(data ?? []);

        // If we have a clientId from params, set its name once loaded
        if (clientIdParam && data) {
          const found = data.find((c) => c.id === clientIdParam);
          if (found) {
            setClientName(found.name || '');
          }
        }
      } catch (e) {
        if (isMounted) {
          Alert.alert('Load failed', e.message ?? String(e));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [query, clientIdParam]);

  // Load minimal session info if sessionId is provided
  useEffect(() => {
    if (!sessionIdParam) return;
    let isMounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, title, start_at, end_at')
          .eq('id', sessionIdParam)
          .single();

        if (error) {
          console.warn('Error loading session for payment:', error.message);
          return;
        }
        if (isMounted && data) {
          setSessionSummary({
            id: data.id,
            title: data.title,
            start_at: data.start_at,
            end_at: data.end_at,
          });
        }
      } catch (e) {
        console.warn('Error loading session for payment:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [sessionIdParam]);

  async function prefillAmount() {
    try {
      if (!clientId) return Alert.alert('Pick a client first');

      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error('Client not found');

      // Monthly rate → just use monthly_rate
      if (client.rate_type === 'monthly') {
        setAmount(String(client.monthly_rate || 0));
        return;
      }

      // Hourly rate: count completed sessions without a package
      const { data: done, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .is('package_id', null);

      if (error) throw error;

      const count = (done ?? []).length;
      setAmount(String((client.hourly_rate || 0) * count));
    } catch (e) {
      Alert.alert('Prefill failed', e.message ?? String(e));
    }
  }

  async function save() {
    try {
      if (!clientId) throw new Error('Pick a client');
      if (!amount || isNaN(Number(amount))) {
        throw new Error('Enter a valid numeric amount');
      }

      setLoading(true);

      const { data: me, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const uid = me?.user?.id;
      if (!uid) throw new Error('No logged-in user');

      const insertPayload = {
        trainer_id: uid,
        client_id: clientId,
        amount: Number(amount || 0),
        currency: 'USD', // or 'HUF' etc
        method,
        note: note || null,
        paid_at: new Date().toISOString(),
      };

      // Your schema uses related_session_ids (int8[])
      if (sessionIdParam) {
        insertPayload.related_session_ids = [Number(sessionIdParam)];
      }

      const { error } = await supabase.from('payments').insert(insertPayload);
      if (error) throw error;

      Alert.alert('Saved', 'Payment recorded', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      Alert.alert('Save failed', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const formattedSession =
    sessionSummary && sessionSummary.start_at && sessionSummary.end_at
      ? `${sessionSummary.title || 'Session'} • ${dayjs(
          sessionSummary.start_at
        ).format('ddd, D MMM')} • ${dayjs(sessionSummary.start_at).format(
          'HH:mm'
        )} – ${dayjs(sessionSummary.end_at).format('HH:mm')}`
      : null;

  return (
    <View style={{ padding: 20, gap: 10, flex: 1, backgroundColor: '#000' }}>
      <Text
        style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 }}
      >
        Record Payment
      </Text>

      {formattedSession ? (
        <View
          style={{
            borderRadius: 10,
            padding: 10,
            backgroundColor: '#111',
            borderWidth: 1,
            borderColor: '#333',
            marginBottom: 8,
          }}
        >
          <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 2 }}>
            Linked session
          </Text>
          <Text style={{ color: '#fff' }}>{formattedSession}</Text>
        </View>
      ) : null}

      <Text style={{ color: '#fff' }}>Search Client</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Type name…"
        placeholderTextColor="#777"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          borderColor: '#444',
          color: '#fff',
        }}
      />

      <FlatList
        data={clients}
        keyExtractor={(c) => String(c.id)}
        style={{
          maxHeight: 180,
          borderWidth: 1,
          borderColor: '#222',
          borderRadius: 8,
          marginBottom: 4,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setClientId(item.id)}
            style={{
              padding: 10,
              backgroundColor:
                clientId === item.id ? '#1a1a1a' : 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: '#222',
            }}
          >
            <Text style={{ color: '#fff' }}>
              {item.name} (#{item.id}) {clientId === item.id ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ padding: 10, color: '#777' }}>No clients found.</Text>
        }
      />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <Button title="Prefill amount" onPress={prefillAmount} />
      </View>

      <Text style={{ color: '#fff' }}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        placeholderTextColor="#777"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          borderColor: '#444',
          color: '#fff',
          marginBottom: 8,
        }}
      />

      {/* Payment method chips */}
      <Text style={{ color: '#fff', marginBottom: 4 }}>Method</Text>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {['cash', 'card', 'transfer', 'other'].map((m) => {
          const active = method === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMethod(m)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? '#4ade80' : '#444',
                backgroundColor: active ? '#111' : 'transparent',
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 13,
                  opacity: active ? 1 : 0.8,
                }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ color: '#fff' }}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="e.g. August hourly sessions"
        placeholderTextColor="#777"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          borderColor: '#444',
          color: '#fff',
          marginBottom: 16,
        }}
        multiline
      />

      <Button
        title={loading ? 'Saving…' : 'Save'}
        onPress={save}
        disabled={loading}
      />
    </View>
  );
}
