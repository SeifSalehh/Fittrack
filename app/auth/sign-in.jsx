// app/auth/sign-in.jsx
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Redirect, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Screen, Card, H1, P, Button, colors } from '../../components/UI';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null); // '/trainer' or '/clients'

  // keep your role-based redirect logic
  useEffect(() => {
    let sub;
    (async () => {
      const routeByRole = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) { setRedirectTo(null); return; }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (error) { console.warn('profile load error', error); setRedirectTo(null); return; }
        const role = (profile?.role || '').toLowerCase();
        setRedirectTo(role === 'client' ? '/clients' : '/trainer');
      };
      await routeByRole();
      sub = supabase.auth.onAuthStateChange(() => { routeByRole(); }).data.subscription;
    })();
    return () => sub?.unsubscribe?.();
  }, []);

  if (redirectTo) return <Redirect href={redirectTo} />;

  async function onSignIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pwd,
      });
      if (error) throw error; // redirect handled by listener
    } catch (err) {
      Alert.alert('Sign-in failed', err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginTop: 6,
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Card>
          <H1 style={{ marginBottom: 12 }}>FitTrack</H1>

          <P>Email</P>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
            selectionColor={colors.accent}
          />

          <P style={{ marginTop: 12 }}>Password</P>
          <TextInput
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            placeholderTextColor={colors.subtext}
            secureTextEntry
            style={inputStyle}
            selectionColor={colors.accent}
          />

          <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={onSignIn} disabled={loading} />

          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <P>
              No account?{' '}
              <Link href="/auth/sign-up" style={{ color: colors.accent, fontWeight: '700' }}>
                Create one
              </Link>
            </P>
          </View>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
