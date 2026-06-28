/**
 * AuthContext — Manejo de autenticación con Supabase.
 *
 * Provee user, session, loading y métodos de auth (signIn, signUp, signOut, resetPassword).
 * Escucha cambios de sesión en tiempo real y restaura sesión al montar.
 */
import * as Sentry from '@sentry/react-native';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { registerForPushNotificationsAsync } from '@/src/services/push-notification-service';

// === TIPOS ===

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

// Mapeo de errores de Supabase a mensajes en español
function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos';
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirma tu email antes de iniciar sesión';
  }
  if (message.includes('User already registered')) {
    return 'Ya existe una cuenta con ese email';
  }
  if (message.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (message.includes('Unable to validate email')) {
    return 'Formato de email inválido';
  }
  if (message.includes('Email rate limit exceeded')) {
    return 'Demasiados intentos. Espera un momento';
  }
  return message;
}

// === CONTEXTO ===

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // #v13g F6: registrar el push token UNA vez por usuario en la sesión. prompt:false → NO pide
  // permiso (solo registra si ya se concedió, p.ej. en onboarding); el login no dispara prompts.
  const pushRegisteredFor = useRef<string | null>(null);
  const maybeRegisterPush = (uid: string) => {
    if (pushRegisteredFor.current === uid) return;
    pushRegisteredFor.current = uid;
    registerForPushNotificationsAsync(uid, { prompt: false }).catch(() => { /* defensivo */ });
  };

  useEffect(() => {
    // Restaurar sesión existente
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Sentry.setUser({ id: s.user.id, email: s.user.email });
        maybeRegisterPush(s.user.id);
      }
      setLoading(false);
    });

    // Escuchar cambios de sesión (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          Sentry.setUser({ id: s.user.id, email: s.user.email });
          maybeRegisterPush(s.user.id);
        } else {
          Sentry.setUser(null);
          pushRegisteredFor.current = null;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Deep link mobile: el email de reset abre la app en `atp://reset-password` (antes caía al
    // Site URL default de Supabase → localhost:3000, roto en device). Enrique ya registró
    // `atp://reset-password` y `atp://**` en Redirect URLs del dashboard.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'atp://reset-password',
    });
    if (error) return { error: translateError(error.message) };
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook para consumir el contexto de autenticación */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
