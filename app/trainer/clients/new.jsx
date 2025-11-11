import React, { useState, useCallback } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Screen, Card, H1, P, Button, colors } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';

export default function NewClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const save = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('clients').insert({
        name: name?.trim() || null,
        email: email?.trim() || null,
        trainer_id: user.id
      });
      if (error) throw error;
      Alert.alert('Saved', 'Client added.');
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message ?? String(e));
    }
  }, [name, email]);

  const inputStyle = {
    backgroundColor: colors.surface, color: colors.text, borderColor: colors.border,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 6
  };

  return (
    <Screen>
      <Card>
        <H1>Add Client</H1>
        <P style={{ marginTop: 8 }}>Name</P>
        <TextInput value={name} onChangeText={setName} placeholder="Client name"
          placeholderTextColor={colors.subtext} style={inputStyle} />
        <P style={{ marginTop: 8 }}>Email (optional, for linking)</P>
        <TextInput value={email} onChangeText={setEmail} placeholder="client@email.com"
          placeholderTextColor={colors.subtext} autoCapitalize="none" style={inputStyle} />
        <View style={{ marginTop: 12 }}>
          <Button title="Save" onPress={save} />
        </View>
      </Card>
    </Screen>
  );
}
