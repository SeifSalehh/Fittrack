// app/clients/index.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthProvider';
import { Screen, Card, H1, H2, P, Button, colors } from '../../components/UI';

export default function ClientDashboard() {
  const { session, loading } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [checking, setChecking] = useState(false);

  const loadTrainer = useCallback(async () => {
    try {
      if (!session?.user) return;
      setChecking(true);

      // 1) Find client row for this user (may be 0 rows if not linked)
      const { data: link, error: linkErr } = await supabase
        .from('clients')
        .select('trainer_id')
        .eq('client_user_id', session.user.id)
        .maybeSingle();

      // PGRST116 = "result contains 0 rows" -> just means no trainer yet
      if (linkErr && linkErr.code !== 'PGRST116') throw linkErr;

      if (!link?.trainer_id) {
        setTrainer(null); // not linked yet
        return;
      }

      // 2) Fetch trainer profile
      const { data: trainerProfile, error: tErr } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', link.trainer_id)
        .single();

      if (tErr) throw tErr;

      setTrainer(trainerProfile);
    } catch (e) {
      Alert.alert('Error', e.message ?? String(e));
    } finally {
      setChecking(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) loadTrainer();
  }, [session?.user, loadTrainer]);

  async function fixLink() {
    try {
      setChecking(true);

      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const user = userData.user;
      if (!user) throw new Error('No user');

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;

      const { error: upErr } = await supabase
        .from('clients')
        .update({ client_user_id: profile.id })
        .eq('email', profile.email)
        .is('client_user_id', null);
      if (upErr) throw upErr;

      await loadTrainer();
      Alert.alert('Done', 'We checked for a trainer using your email.');
    } catch (e) {
      Alert.alert('Fix link failed', e.message ?? String(e));
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/sign-in');
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <Screen>
      <H1>Dashboard</H1>

      {/* Main card */}
      <Card style={{ marginTop: 12 }}>
        {trainer ? (
          <>
            <H2>Your Trainer</H2>
            <P style={{ marginTop: 4 }}>{trainer.name || trainer.email}</P>
            <P style={{ marginTop: 2, color: colors.subtext }}>{trainer.email}</P>
          </>
        ) : (
          <>
            <H2>No trainer connected yet</H2>
            <P style={{ marginTop: 6, color: colors.subtext }}>
              Once a trainer adds your email in FitTrack, you’ll see your trainer and sessions here.
            </P>
          </>
        )}
      </Card>

      {/* Actions card - small + neat */}
      <Card style={{ marginTop: 12, gap: 8 }}>
        {!trainer && (
          <Button
            title={checking ? 'Checking…' : 'Check for trainer'}
            onPress={loadTrainer}
            disabled={checking}
          />
        )}
        {!trainer && (
          <Button
            title={checking ? 'Fixing link…' : 'Fix link (email)'}
            variant="outline"
            onPress={fixLink}
            disabled={checking}
          />
        )}
        <Button title="Log out" variant="outline" onPress={logout} />
      </Card>
    </Screen>
  );
}
