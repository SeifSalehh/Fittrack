// app/auth/sign-up.jsx
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, TextInput, View, Pressable } from 'react-native';
import { Redirect, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Screen, Card, H1, H2, P, Button, colors } from '../../components/UI';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [role, setRole] = useState('client'); // 'client' | 'trainer'
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);

  // After auth changes, route by role
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
        const r = (profile?.role || '').toLowerCase();
        setRedirectTo(r === 'client' ? '/clients' : '/trainer');
      };
      await routeByRole();
      sub = supabase.auth.onAuthStateChange(() => { routeByRole(); }).data.subscription;
    })();
    return () => sub?.unsubscribe?.();
  }, []);

  if (redirectTo) return <Redirect href={redirectTo} />;

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

  async function onSignUp() {
    try {
      if (!email.trim() || !pwd) {
        Alert.alert('Missing info', 'Please enter an email and password.');
        return;
      }
      if (pwd.length < 6) {
        Alert.alert('Weak password', 'Use at least 6 characters.');
        return;
      }

      setLoading(true);

      // 1) Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pwd,
      });
      if (error) throw error;

      const uid = data.user?.id;
      if (!uid) {
        // If email confirmation is required, you’ll reach here without a session.
        Alert.alert('Check your email', 'We sent you a confirmation link to finish sign up.');
        return;
      }

      // 2) Upsert profile with role
      const { error: upErr } = await supabase
        .from('profiles')
        .upsert({ id: uid, role: role.toLowerCase() }, { onConflict: 'id' });
      if (upErr) throw upErr;

      // 3) If client, auto-link their client row by email (safe if none exists)
      if (role === 'client') {
        try { await supabase.rpc('client_self_link'); } catch (e) { /* non-fatal */ }
      }

      // Auth listener will redirect based on profile role
    } catch (err) {
      Alert.alert('Sign up failed', err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  // Little segmented control for role
  function RoleToggle() {
    const Opt = ({ val, label }) => {
      const active = role === val;
      return (
        <Pressable
          onPress={() => setRole(val)}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 999,
            backgroundColor: active ? colors.accent : 'transparent',
            borderWidth: 1,
            borderColor: active ? 'transparent' : colors.border,
            marginHorizontal: 4,
          }}
        >
          <H2 style={{ fontSize: 14, color: active ? '#000' : colors.text }}>{label}</H2>
        </Pressable>
      );
    };
    return (
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <Opt val="client" label="Client" />
        <Opt val="trainer" label="Trainer" />
      </View>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Card>
          <H1 style={{ marginBottom: 12 }}>Create Account</H1>

          <P>Role</P>
          <RoleToggle />

          <P style={{ marginTop: 12 }}>Email</P>
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

          <Button title={loading ? 'Creating…' : 'Sign Up'} onPress={onSignUp} disabled={loading} />

          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <P>
              Already have an account?{' '}
              <Link href="/auth/sign-in" style={{ color: colors.accent, fontWeight: '700' }}>
                Sign in
              </Link>
            </P>
          </View>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
