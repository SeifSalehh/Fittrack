// app/trainer/(tabs)/profile.jsx
import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../../components/UI';

function Avatar({ name = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'T';
  return (
    <View style={{
      width: 72, height: 72, borderRadius: 9999,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center'
    }}>
      <H2 style={{ fontSize: 22 }}>{initials}</H2>
    </View>
  );
}

export default function ProfileTab() {
  const [profile, setProfile] = useState({ name: '', email: '' });

  const load = useCallback(async () => {
    const { data: me } = await supabase.auth.getUser();
    const user = me?.user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    setProfile({ name: data?.name || 'Trainer', email: user.email || '' });
  }, []);

  useEffect(() => { load(); }, [load]);

  const logout = async () => { await supabase.auth.signOut(); };

  return (
    <Screen>
      <H1>Profile</H1>
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={profile.name} />
          <View>
            <H2 style={{ fontSize: 18 }}>{profile.name}</H2>
            <P>{profile.email}</P>
          </View>
        </View>
      </Card>

      <Button title="Log out" onPress={logout} style={{ marginTop: 16 }} />
    </Screen>
  );
}
