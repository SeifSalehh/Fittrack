import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function NewPayment() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const base = supabase.from('clients').select('id, name, rate_type, hourly_rate, monthly_rate').order('name');
      const { data, error } = query ? await base.ilike('name', `%${query}%`) : await base;
      if (error) Alert.alert('Load failed', error.message);
      setClients(data ?? []);
    })();
  }, [query]);

  async function prefillAmount() {
    try {
      if (!clientId) return Alert.alert('Pick a client');
      const client = clients.find(c => c.id === clientId);
      if (!client) throw new Error('Client not found');

      if (client.rate_type === 'monthly') {
        setAmount(String(client.monthly_rate || 0));
        return;
      }

      // hourly: completed sessions not tied to a package
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
      setLoading(true);
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;

      const { error } = await supabase.from('payments').insert({
        trainer_id: uid,
        client_id: clientId,
        amount: Number(amount || 0),
        currency: 'USD',
        method: 'cash',
        note: note || null,
      });
      if (error) throw error;

      Alert.alert('Saved', 'Payment recorded');
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 20, gap: 10, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Record Payment</Text>

      <Text>Search Client</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Type name…"
        style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <FlatList
        data={clients}
        keyExtractor={(c) => String(c.id)}
        style={{ maxHeight: 180, borderWidth: 1, borderColor: '#eee', borderRadius: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setClientId(item.id)}
            style={{
              padding: 10,
              backgroundColor: clientId === item.id ? '#e6f7ff' : 'white',
              borderBottomWidth: 1, borderBottomColor: '#eee'
            }}>
            <Text>{item.name} (#{item.id}) {clientId === item.id ? '✓' : ''}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ padding: 10 }}>No clients found.</Text>}
      />

      <View style={{ flexDirection:'row', gap: 8 }}>
        <Button title="Prefill amount" onPress={prefillAmount} />
      </View>

      <Text>Amount</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric"
        placeholder="0.00" style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Text>Note (optional)</Text>
      <TextInput value={note} onChangeText={setNote}
        placeholder="e.g. August hourly sessions" style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Button title={loading ? 'Saving…' : 'Save'} onPress={save} disabled={loading} />
    </View>
  );
}
