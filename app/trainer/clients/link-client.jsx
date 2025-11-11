// app/trainer/clients/link-client.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

export default function LinkClient() {
  const { clientId, presetEmail } = useLocalSearchParams();
  const [email, setEmail] = useState(presetEmail || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presetEmail) setEmail(String(presetEmail));
  }, [presetEmail]);

  const onLink = async () => {
    try {
      setSaving(true);
      if (!email) throw new Error('Enter an email');

      // find profile for this email
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      let clientUserId = null;
      if (prof && (prof.role || '').toLowerCase() === 'client') {
        clientUserId = prof.id;
      }

      const { error: upErr } = await supabase
        .from('clients')
        .update({ email: email.trim(), client_user_id: clientUserId })
        .eq('id', clientId);
      if (upErr) throw upErr;

      Alert.alert(
        clientUserId ? 'Linked' : 'Saved',
        clientUserId
          ? 'Client account linked to this email.'
          : 'Email saved. It will auto-link once they sign up.'
      );
      router.back();
    } catch (e) {
      Alert.alert('Link failed', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Link Client by Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="client@email.com"
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <Button title={saving ? 'Linking…' : 'Save & Link'} onPress={onLink} disabled={saving} />
    </View>
  );
}
