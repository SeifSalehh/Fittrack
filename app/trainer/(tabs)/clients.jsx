// app/trainer/(tabs)/clients.jsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthProvider';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';

export default function TrainerClients() {
  const { session } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    try {
      if (!session?.user) return;
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, client_user_id')
        .eq('trainer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data ?? []);
    } catch (e) {
      Alert.alert('Error', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, [session?.user]);

  return (
    <Screen>
      <H1>Clients</H1>

      <Card style={{ marginVertical: 12 }}>
        <Link href="/trainer/clients/new" asChild>
          <Button title="Add client profile" />
        </Link>
        <View style={{ height: 8 }} />
        <Link href="/trainer/clients/link-client" asChild>
          <Button title="Link by email" variant="outline" />
        </Link>
      </Card>

      <Card>
        <H2>Linked Clients</H2>
        <FlatList
          data={clients}
          keyExtractor={(x) => String(x.id)}
          refreshing={loading}
          onRefresh={loadClients}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
              <P style={{ fontWeight: '700' }}>{item.name || item.email || 'Unnamed client'}</P>
              {item.email && (
                <P style={{ color: colors.subtext }}>{item.email}</P>
              )}
              <P style={{ marginTop: 2 }}>
                {item.client_user_id ? '✅ App user linked' : '⏳ Waiting for app sign-up'}
              </P>

              <View style={{ marginTop: 6 }}>
                <Link
                  href={{
                    pathname: '/trainer/clients/link-client',
                    params: { clientId: item.id, presetEmail: item.email || '' },
                  }}
                  asChild
                >
                  <Button title="Edit / Link" variant="outline" />
                </Link>
              </View>
            </View>
          )}
          ListEmptyComponent={<P style={{ paddingVertical: 10 }}>No clients yet.</P>}
        />
      </Card>
    </Screen>
  );
}
