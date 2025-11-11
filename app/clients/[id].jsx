import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Button, FlatList, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Link } from 'expo-router';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';


export default function ClientProfile() {
  const { id } = useLocalSearchParams();            // client id (string)
  const clientId = Number(id);
  const [tab, setTab] = useState('training');       // 'training' | 'finances'
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [{ data: c }, { data: s }, { data: pk }, { data: pay }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('sessions')
          .select('id, start_at, end_at, status, mode, package_id')
          .eq('client_id', clientId).order('start_at', { ascending: false }),
        supabase.from('packages')
          .select('id, name, price, sessions_total, sessions_used, status, starts_on, expires_on')
          .eq('client_id', clientId).order('id', { ascending: false }),
        supabase.from('payments')
          .select('id, amount, currency, method, paid_at, note')
          .eq('client_id', clientId).order('paid_at', { ascending: false }),
      ]);
      setClient(c || null);
      setSessions(s || []);
      setPackages(pk || []);
      setPayments(pay || []);
    } catch (e) {
      Alert.alert('Load failed', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [clientId]);

  const remainingSessions = useMemo(() => {
    const active = (packages || []).find(p => p.status === 'active');
    if (!active) return null;
    return Math.max(0, (active.sessions_total ?? 0) - (active.sessions_used ?? 0));
  }, [packages]);

  async function completeSession(sessionId) {
    try {
      // find active package with remaining
      const active = (packages || []).find(p => p.status === 'active' && (p.sessions_total - p.sessions_used) > 0);
      const updates = { status: 'completed' };
      if (active) updates.package_id = active.id;

      const { error: sErr } = await supabase.from('sessions').update(updates).eq('id', sessionId);
      if (sErr) throw sErr;

      if (active) {
        const { error: pErr } = await supabase
          .from('packages').update({ sessions_used: active.sessions_used + 1 }).eq('id', active.id);
        if (pErr) throw pErr;
      }
      load();
    } catch (e) {
      Alert.alert('Complete failed', e.message ?? String(e));
    }
  }

  if (loading) {
    return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Loading…</Text></View>;
  }
  if (!client) return <View style={{ padding:20 }}><Text>Client not found.</Text></View>;

  return (
    <View style={{ flex:1 }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth:1, borderColor:'#eee', gap: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>{client.name}</Text>
        <Text style={{ color:'#555' }}>
          {client.rate_type === 'hourly'
            ? `Hourly ${client.hourly_rate ?? 0}`
            : client.rate_type === 'monthly'
            ? `Monthly ${client.monthly_rate ?? 0}`
            : 'Package-based'}
        </Text>
        <View style={{ flexDirection:'row', gap: 8, marginTop: 4 }}>
          <Button title={tab === 'training' ? 'Training ✓' : 'Training'} onPress={() => setTab('training')} />
          <Button title={tab === 'finances' ? 'Finances ✓' : 'Finances'} onPress={() => setTab('finances')} />
        </View>
      </View>

      {tab === 'training' ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Package summary */}
          <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:10, padding:12 }}>
            <Text style={{ fontWeight:'600' }}>Package</Text>
            {packages.length === 0 && <Text>No packages.</Text>}
            {packages.map(p => (
              <View key={p.id} style={{ paddingVertical:6, borderBottomWidth:1, borderColor:'#f3f3f3' }}>
                <Text>{p.name} — {p.status}</Text>
                <Text>{p.sessions_used}/{p.sessions_total} used</Text>
                <Text>{p.starts_on || '-'} → {p.expires_on || '-'}</Text>
              </View>
            ))}
            {remainingSessions !== null && <Text style={{ marginTop:6 }}>Sessions remaining: {remainingSessions}</Text>}
            <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
              <Link href={`/trainer/sessions/new?client=${clientId}`} asChild><Button title="Add Session" /></Link>
              <Link href={`/trainer/payments/new?client=${clientId}`} asChild><Button title="Record Payment" /></Link>
            </View>
          </View>

          {/* Sessions list */}
          <Text style={{ fontWeight:'700' }}>Sessions</Text>
          <FlatList
            data={sessions}
            keyExtractor={(s) => String(s.id)}
            renderItem={({ item }) => (
              <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#eee' }}>
                <Text>{dayjs(item.start_at).format('YYYY-MM-DD HH:mm')} · {item.mode} · {item.status}</Text>
                {item.status !== 'completed' && (
                  <View style={{ marginTop:6 }}>
                    <Button title="Mark Completed" onPress={() => completeSession(item.id)} />
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={<Text>No sessions yet.</Text>}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Payments summary */}
          <View style={{ borderWidth:1, borderColor:'#eee', borderRadius:10, padding:12 }}>
            <Text style={{ fontWeight:'700' }}>Payments</Text>
            <FlatList
              data={payments}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => (
                <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#eee' }}>
                  <Text>{dayjs(item.paid_at).format('YYYY-MM-DD')} — {Number(item.amount).toFixed(2)} {item.currency}</Text>
                  <Text style={{ color:'#555' }}>{item.method}{item.note ? ` — ${item.note}` : ''}</Text>
                </View>
              )}
              ListEmptyComponent={<Text>No payments yet.</Text>}
            />
            <View style={{ marginTop:8 }}>
              <Link href={`/trainer/payments/new?client=${clientId}`} asChild><Button title="Record Payment" /></Link>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
  async function linkClientToUser(clientId, clientEmail) {
    // Find the profile row by email
    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', clientEmail)
      .single();
    if (findErr) throw findErr;
  
    // Link it
    const { error: linkErr } = await supabase
      .from('clients')
      .update({ client_user_id: profile.id })
      .eq('id', clientId);
    if (linkErr) throw linkErr;
  }
  
}
