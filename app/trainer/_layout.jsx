// app/trainer/_layout.jsx
import React from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TrainerLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerBackTitle: '',
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },

        // 🔥 Custom animated back button
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                marginLeft: 8,
                padding: 6,
                borderRadius: 999,
                backgroundColor: pressed ? '#00000088' : '#00000055',
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : null,
      }}
    >
      {/* Tabs (no header) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Screens */}
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen name="clients/[id]" options={{ title: 'Client' }} />
      <Stack.Screen name="clients/new" options={{ title: 'New Client' }} />

      <Stack.Screen name="finances/index" options={{ title: 'Finances' }} />

      <Stack.Screen name="payments/index" options={{ title: 'Payments' }} />
      <Stack.Screen name="payments/new" options={{ title: 'Record Payment' }} />

      <Stack.Screen name="sessions/new" options={{ title: 'Add Session' }} />
      <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
    </Stack>
  );
}
