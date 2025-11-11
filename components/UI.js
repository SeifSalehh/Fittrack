// components/UI.js
import { View, Text, Pressable } from 'react-native';

export const colors = {
  bg: '#121212',
  surface: '#181818',
  text: '#E6E6E6',
  subtext: '#B3B3B3',
  accent: '#1DB954',
  accentDim: '#169947',
  border: '#2A2A2A',
  danger: '#FF5A5F'
};

export const Screen = ({ children, style }) => (
  <View style={[{ flex: 1, backgroundColor: colors.bg, padding: 16 }, style]}>
    {children}
  </View>
);

export const Card = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border
      },
      style
    ]}
  >
    {children}
  </View>
);

export const H1 = ({ children, style }) => (
  <Text style={[{ color: colors.text, fontSize: 22, fontWeight: '700' }, style]}>
    {children}
  </Text>
);
export const H2 = ({ children, style }) => (
  <Text style={[{ color: colors.text, fontSize: 18, fontWeight: '600' }, style]}>
    {children}
  </Text>
);
export const P = ({ children, style }) => (
  <Text style={[{ color: colors.subtext, fontSize: 14 }, style]}>{children}</Text>
);


export const Button = ({ title, onPress, variant = 'solid', disabled }) => {
  const base = {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    borderWidth: 1
  };
  const styles =
    variant === 'outline'
      ? { backgroundColor: 'transparent', borderColor: colors.accent }
      : { backgroundColor: disabled ? colors.accentDim : colors.accent, borderColor: 'transparent' };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [base, styles, pressed && { opacity: 0.8 }]}
    >
      <Text style={{ color: '#000', fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
};
