/**
 * ProgramsContext — Estado global de los programas del usuario.
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
import { generateId, type Program, type Routine } from '@/types/models';

// === ESTADO ===

interface ProgramsState {
  programs: Program[];
  loading: boolean;
}

// === ACCIONES ===

type Action =
  | { type: 'LOADED'; programs: Program[] }
  | { type: 'ADDED'; program: Program }
  | { type: 'DELETED'; id: string }
  | { type: 'ROUTINE_ADDED'; programId: string; routine: Routine };

function reducer(state: ProgramsState, action: Action): ProgramsState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, programs: action.programs, loading: false };
    case 'ADDED':
      return { ...state, programs: [...state.programs, action.program] };
    case 'DELETED':
      return { ...state, programs: state.programs.filter(p => p.id !== action.id) };
    case 'ROUTINE_ADDED':
      return {
        ...state,
        programs: state.programs.map(p =>
          p.id === action.programId
            ? { ...p, routines: [...p.routines, action.routine], updatedAt: Date.now() }
            : p
        ),
      };
    default:
      return state;
  }
}

// === CONTEXTO ===

interface ProgramsContextType {
  programs: Program[];
  loading: boolean;
  addProgram: (name: string, description: string) => Program;
  deleteProgram: (id: string) => void;
  addRoutineToProgram: (programId: string, routine: Routine) => void;
}

const ProgramsContext = createContext<ProgramsContextType | null>(null);

export function ProgramsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { programs: [], loading: true });

  // Cargar programas desde AsyncStorage al montar
  useEffect(() => {
    Storage.getPrograms().then(programs =>
      dispatch({ type: 'LOADED', programs })
    );
  }, []);

  // Persistir cada vez que cambian los programas
  useEffect(() => {
    if (!state.loading) {
      Storage.savePrograms(state.programs);
    }
  }, [state.programs, state.loading]);

  const addProgram = useCallback((name: string, description: string): Program => {
    const program: Program = {
      id: generateId(),
      name,
      description,
      routines: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isStandard: false,
    };
    dispatch({ type: 'ADDED', program });
    return program;
  }, []);

  const deleteProgram = useCallback((id: string) => {
    dispatch({ type: 'DELETED', id });
  }, []);

  const addRoutineToProgram = useCallback((programId: string, routine: Routine) => {
    dispatch({ type: 'ROUTINE_ADDED', programId, routine });
  }, []);

  return (
    <ProgramsContext.Provider
      value={{
        programs: state.programs,
        loading: state.loading,
        addProgram,
        deleteProgram,
        addRoutineToProgram,
      }}
    >
      {children}
    </ProgramsContext.Provider>
  );
}

/** Hook para consumir el contexto de programas */
export function usePrograms() {
  const ctx = useContext(ProgramsContext);
  if (!ctx) throw new Error('usePrograms debe usarse dentro de ProgramsProvider');
  return ctx;
}
