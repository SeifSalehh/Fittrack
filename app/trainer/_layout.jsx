// app/trainer/_layout.jsx
import { Stack } from 'expo-router';

export default function TrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The 4-tab area */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Non-tab screens live as normal stack routes */}
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen name="clients/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="finances/index" options={{ title: 'Finances' }} />
      <Stack.Screen name="payments/index" options={{ title: 'Payments' }} />
      <Stack.Screen name="add-session" options={{ title: 'Add Session' }} />
      <Stack.Screen name="record-payment" options={{ title: 'Record Payment' }} />
      <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
    </Stack>
  );
}
