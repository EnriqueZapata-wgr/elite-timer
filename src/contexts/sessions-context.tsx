/**
 * SessionsContext — Historial de sesiones completadas.
 * Carga desde AsyncStorage al montar y persiste automáticamente.
 */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { Storage } from '@/services/storage';
import type { Session } from '@/types/models';

// === ESTADO ===

interface SessionsState {
  sessions: Session[];
  loading: boolean;
}

// === ACCIONES ===

type Action =
  | { type: 'LOADED'; sessions: Session[] }
  | { type: 'ADDED'; session: Session };

function reducer(state: SessionsState, action: Action): SessionsState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, sessions: action.sessions, loading: false };
    case 'ADDED':
      return { ...state, sessions: [action.session, ...state.sessions] };
    default:
      return state;
  }
}

// === CONTEXTO ===

interface SessionsContextType {
  sessions: Session[];
  loading: boolean;
  addSession: (session: Session) => void;
}

const SessionsContext = createContext<SessionsContextType | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { sessions: [], loading: true });

  // Cargar sesiones al montar
  useEffect(() => {
    Storage.getSessions().then(sessions =>
      dispatch({ type: 'LOADED', sessions })
    );
  }, []);

  // Persistir cuando cambian
  useEffect(() => {
    if (!state.loading) {
      Storage.saveSessions(state.sessions);
    }
  }, [state.sessions, state.loading]);

  const addSession = useCallback((session: Session) => {
    dispatch({ type: 'ADDED', session });
  }, []);

  return (
    <SessionsContext.Provider
      value={{ sessions: state.sessions, loading: state.loading, addSession }}
    >
      {children}
    </SessionsContext.Provider>
  );
}

/** Hook para consumir el contexto de sesiones */
export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions debe usarse dentro de SessionsProvider');
  return ctx;
}
