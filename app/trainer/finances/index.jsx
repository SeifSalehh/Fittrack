// app/trainer/finances/index.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, FlatList, Modal, TextInput, View } from 'react-native';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';

export default function Finances() {
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // modal form state
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [method, setMethod] = useState('cash');
  const [sessionsPurchased, setSessionsPurchased] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // last 12 months
      const since = dayjs().subtract(12, 'month').startOf('month').toISOString();

      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, currency, paid_at, method, sessions_purchased, client_id, clients(name)')
        .eq('trainer_id', user.id)
        .gte('paid_at', since)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setPayments(data ?? []);
    } catch (e) {
      Alert.alert('Load error', e.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // realtime: refresh when this trainer’s payments change
  useEffect(() => {
    let ch;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase
        .channel('rt-trainer-payments')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `trainer_id=eq.${user.id}`,
        }, () => load())
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [load]);

  // KPIs
  const kpis = useMemo(() => {
    const monthKey = dayjs().format('YYYY-MM');
    let monthSum = 0, yearSum = 0, count = 0;
    payments.forEach(p => {
      count++;
      const amt = Number(p.amount || 0);
      yearSum += amt;
      if (dayjs(p.paid_at).format('YYYY-MM') === monthKey) monthSum += amt;
    });
    return { monthSum, yearSum, count };
  }, [payments]);

  // Monthly groups
  const monthly = useMemo(() => {
    const map = {};
    for (const p of payments) {
      const key = dayjs(p.paid_at).format('YYYY-MM');
      map[key] = (map[key] || 0) + Number(p.amount || 0);
    }
    return Object.entries(map)
      .map(([month, sum]) => ({ month, sum }))
      .sort((a, b) => (a.month < b.month ? 1 : -1)); // newest first
  }, [payments]);

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6
  };

  const savePayment = useCallback(async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amt = Number(amount);
      const sp = Number(sessionsPurchased || 0);
      if (!clientId || isNaN(amt)) {
        Alert.alert('Missing info', 'Client ID and valid amount are required.');
        return;
      }

      const { error } = await supabase.from('payments').insert({
        client_id: clientId,
        amount: amt,
        currency: currency || 'EUR',
        method: method || 'cash',
        sessions_purchased: sp,
        paid_at: new Date().toISOString(),
        trainer_id: user.id,
      });
      if (error) throw error;

      setOpen(false);
      setClientId(''); setAmount(''); setCurrency('EUR'); setMethod('cash'); setSessionsPurchased('');
      await load();
    } catch (e) {
      Alert.alert('Save failed', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }, [clientId, amount, currency, method, sessionsPurchased, load]);

  return (
    <Screen>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <H1>Finances</H1>
        <Button title="Record Payment" onPress={() => setOpen(true)} />
      </View>

      {/* KPIs */}
      <View style={{ flexDirection:'row', gap:12, marginBottom:12 }}>
        <Card style={{ flex:1 }}>
          <H2>Payments (month)</H2>
          <P style={{ fontSize:28, color: colors.text }}>{kpis.monthSum.toFixed(2)}</P>
        </Card>
        <Card style={{ flex:1 }}>
          <H2>Payments (YTD)</H2>
          <P style={{ fontSize:28, color: colors.text }}>{kpis.yearSum.toFixed(2)}</P>
        </Card>
        <Card style={{ flex:1 }}>
          <H2>Count</H2>
          <P style={{ fontSize:28, color: colors.text }}>{kpis.count}</P>
        </Card>
      </View>

      {/* Monthly totals */}
      <H2>Monthly Revenue</H2>
      <Card style={{ marginTop:8, padding:0 }}>
        <FlatList
          data={monthly}
          keyExtractor={(x) => x.month}
          renderItem={({ item }) => (
            <View style={{ padding:14, borderBottomWidth:1, borderColor: colors.border }}>
              <H2 style={{ fontSize:16 }}>{item.month}</H2>
              <P>{Number(item.sum).toFixed(2)}</P>
            </View>
          )}
          ListEmptyComponent={<P style={{ padding:14 }}>No payments yet.</P>}
        />
      </Card>

      {/* All payments */}
      <H2 style={{ marginTop:12 }}>All Payments</H2>
      <Card style={{ marginTop:8, padding:0 }}>
        <FlatList
          data={payments}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <View style={{ padding:14, borderBottomWidth:1, borderColor: colors.border }}>
              <H2 style={{ fontSize:16 }}>
                {Number(item.amount || 0).toFixed(2)} {item.currency || ''} {item.clients?.name ? `· ${item.clients.name}` : ''}
              </H2>
              <P>{dayjs(item.paid_at).format('YYYY-MM-DD')}</P>
              {!!item.method && <P>Method: {item.method}</P>}
              <P>Sessions purchased: {item.sessions_purchased ?? 0}</P>
            </View>
          )}
          ListEmptyComponent={<P style={{ padding:14 }}>No payments yet.</P>}
          refreshing={refreshing}
          onRefresh={load}
        />
      </Card>

      {/* Record payment modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', padding:16 }}>
          <Card>
            <H2>Record Payment</H2>
            <P style={{ marginTop:8 }}>Client ID</P>
            <TextInput
              value={clientId}
              onChangeText={setClientId}
              placeholder="client uuid"
              placeholderTextColor={colors.subtext}
              style={inputStyle}
            />
            <P style={{ marginTop:8 }}>Amount</P>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 80"
              placeholderTextColor={colors.subtext}
              style={inputStyle}
            />
            <P style={{ marginTop:8 }}>Currency</P>
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder="EUR"
              placeholderTextColor={colors.subtext}
              style={inputStyle}
            />
            <P style={{ marginTop:8 }}>Method</P>
            <TextInput
              value={method}
              onChangeText={setMethod}
              placeholder="cash / card"
              placeholderTextColor={colors.subtext}
              style={inputStyle}
            />
            <P style={{ marginTop:8 }}>Sessions purchased</P>
            <TextInput
              value={sessionsPurchased}
              onChangeText={setSessionsPurchased}
              keyboardType="number-pad"
              placeholder="e.g. 4"
              placeholderTextColor={colors.subtext}
              style={inputStyle}
            />
            <View style={{ marginTop:12 }}>
              <Button title={saving ? 'Saving…' : 'Save'} onPress={savePayment} disabled={saving} />
              <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
