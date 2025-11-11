import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
export default function Index() {
  const [ready, setReady] = useState(false);
  const [dest, setDest] = useState('/auth/sign-in');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setReady(true); return; }

      const uid = data.session.user.id;
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single();
      setDest(prof?.role === 'client' ? '/client' : '/trainer');
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return <Redirect href={dest} />;
}
