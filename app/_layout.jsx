import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#E6E6E6',
        contentStyle: { backgroundColor: '#121212' }
      }}/>
    </>
  );
}
