/**
 * UserAvatar — Avatar circular del usuario, unificado en TODA la app.
 *
 * Reemplaza las 3 implementaciones inline (32px en kit, 36px en index,
 * 44px con gradient en yo). Default 36x36 con borde verde.
 *
 * Uso:
 *   <UserAvatar uri={user?.avatar_url} name={user?.email} />
 *   <UserAvatar uri={null} name="Enrique" size={44} />
 */
import { View, Image, Text, StyleSheet } from 'react-native';
import { ATP_BRAND } from '@/src/constants/brand';

interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function UserAvatar({ uri, name, size = 36 }: UserAvatarProps) {
  const radius = size / 2;
  const dim = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, dim]} />;
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? 'A';

  return (
    <View style={[styles.placeholder, dim]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1.5,
    borderColor: ATP_BRAND.lime,
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: ATP_BRAND.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: ATP_BRAND.lime,
    fontWeight: '600',
  },
});
