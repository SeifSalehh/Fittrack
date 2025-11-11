import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function NewClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goals, setGoals] = useState('');
  const [rateType, setRateType] = useState('hourly'); // 'hourly' | 'monthly' | 'package'
  const [hourlyRate, setHourlyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [mode, setMode] = useState('in_person'); // 'online' | 'in_person'
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  async function save() {
    try {
      if (!name.trim()) throw new Error('Name is required');
      if (rateType === 'hourly' && !hourlyRate) throw new Error('Hourly rate required');
      if (rateType === 'monthly' && !monthlyRate) throw new Error('Monthly rate required');

      setLoading(true);
      const { data: me } = await supabase.auth.getUser();
      const uid = me?.user?.id;

      const { error } = await supabase.from('clients').insert({
        trainer_id: uid,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        goals: goals.trim() || null,
        start_date: startDate || null,
        preferred_mode: mode,
        rate_type: rateType,
        hourly_rate: rateType === 'hourly' ? Number(hourlyRate) : null,
        monthly_rate: rateType === 'monthly' ? Number(monthlyRate) : null,
      });
      if (error) throw error;

      Alert.alert('Saved', 'Client created');
      router.back(); // return to previous screen
    } catch (e) {
      Alert.alert('Could not save', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>New Client</Text>

      <Text>Name *</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
        style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Text>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad"
        style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Text>Goals</Text>
      <TextInput value={goals} onChangeText={setGoals} multiline
        style={{ borderWidth:1, padding:10, borderRadius:8, minHeight:70 }} />

      <Text>Preferred Mode</Text>
      <View style={{ flexDirection:'row', gap: 8 }}>
        <Button title={mode === 'in_person' ? 'In Person ✓' : 'In Person'} onPress={() => setMode('in_person')} />
        <Button title={mode === 'online' ? 'Online ✓' : 'Online'} onPress={() => setMode('online')} />
      </View>

      <Text>Start Date (YYYY-MM-DD)</Text>
      <TextInput value={startDate} onChangeText={setStartDate} placeholder="2025-09-22"
        style={{ borderWidth:1, padding:10, borderRadius:8 }} />

      <Text>Rate Type</Text>
      <View style={{ flexDirection:'row', gap: 8, flexWrap:'wrap' }}>
        <Button title={rateType==='hourly' ? 'Hourly ✓' : 'Hourly'} onPress={() => setRateType('hourly')} />
        <Button title={rateType==='monthly' ? 'Monthly ✓' : 'Monthly'} onPress={() => setRateType('monthly')} />
        <Button title={rateType==='package' ? 'Package ✓' : 'Package'} onPress={() => setRateType('package')} />
      </View>

      {rateType === 'hourly' && (
        <>
          <Text>Hourly Rate</Text>
          <TextInput value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric"
            style={{ borderWidth:1, padding:10, borderRadius:8 }} />
        </>
      )}

      {rateType === 'monthly' && (
        <>
          <Text>Monthly Rate</Text>
          <TextInput value={monthlyRate} onChangeText={setMonthlyRate} keyboardType="numeric"
            style={{ borderWidth:1, padding:10, borderRadius:8 }} />
        </>
      )}

      <Button title={loading ? 'Saving…' : 'Save'} onPress={save} disabled={loading} />
    </View>
  );
}
