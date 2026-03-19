/**
 * ProgramsContext — Estado global de programas y rutinas del usuario.
 *
 * Las rutinas son entidades independientes (tienen su propio store).
 * Los programas referencian rutinas por ID (routineIds[]).
 * Esto permite reutilizar rutinas y migrar a Supabase sin cambios.
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
  routines: Routine[];
  loading: boolean;
}

// === ACCIONES ===

type Action =
  | { type: 'LOADED'; programs: Program[]; routines: Routine[] }
  | { type: 'PROGRAM_ADDED'; program: Program }
  | { type: 'PROGRAM_DELETED'; id: string }
  | { type: 'ROUTINE_ADDED'; routine: Routine; programId?: string }
  | { type: 'ROUTINE_DELETED'; id: string };

function reducer(state: ProgramsState, action: Action): ProgramsState {
  switch (action.type) {
    case 'LOADED':
      return { ...state, programs: action.programs, routines: action.routines, loading: false };

    case 'PROGRAM_ADDED':
      return { ...state, programs: [...state.programs, action.program] };

    case 'PROGRAM_DELETED':
      return { ...state, programs: state.programs.filter(p => p.id !== action.id) };

    case 'ROUTINE_ADDED': {
      const newRoutines = [...state.routines, action.routine];
      // Si hay programId, vincular la rutina al programa
      const newPrograms = action.programId
        ? state.programs.map(p =>
            p.id === action.programId
              ? { ...p, routineIds: [...p.routineIds, action.routine.id], updatedAt: Date.now() }
              : p
          )
        : state.programs;
      return { ...state, routines: newRoutines, programs: newPrograms };
    }

    case 'ROUTINE_DELETED':
      return {
        ...state,
        routines: state.routines.filter(r => r.id !== action.id),
        // Limpiar referencia en todos los programas
        programs: state.programs.map(p => ({
          ...p,
          routineIds: p.routineIds.filter(rid => rid !== action.id),
        })),
      };

    default:
      return state;
  }
}

// === CONTEXTO ===

interface ProgramsContextType {
  programs: Program[];
  routines: Routine[];
  loading: boolean;
  addProgram: (name: string, description: string) => Program;
  deleteProgram: (id: string) => void;
  addRoutine: (routine: Routine, programId?: string) => void;
  deleteRoutine: (id: string) => void;
  getRoutineById: (id: string) => Routine | undefined;
  getRoutinesForProgram: (programId: string) => Routine[];
}

const ProgramsContext = createContext<ProgramsContextType | null>(null);

export function ProgramsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    programs: [],
    routines: [],
    loading: true,
  });

  // Cargar programas y rutinas desde AsyncStorage al montar
  useEffect(() => {
    Promise.all([Storage.getPrograms(), Storage.getRoutines()]).then(
      ([programs, routines]) => dispatch({ type: 'LOADED', programs, routines })
    );
  }, []);

  // Persistir programas cuando cambian
  useEffect(() => {
    if (!state.loading) {
      Storage.savePrograms(state.programs);
    }
  }, [state.programs, state.loading]);

  // Persistir rutinas cuando cambian
  useEffect(() => {
    if (!state.loading) {
      Storage.saveRoutines(state.routines);
    }
  }, [state.routines, state.loading]);

  const addProgram = useCallback((name: string, description: string): Program => {
    const program: Program = {
      id: generateId(),
      name,
      description,
      routineIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isStandard: false,
    };
    dispatch({ type: 'PROGRAM_ADDED', program });
    return program;
  }, []);

  const deleteProgram = useCallback((id: string) => {
    dispatch({ type: 'PROGRAM_DELETED', id });
  }, []);

  const addRoutine = useCallback((routine: Routine, programId?: string) => {
    dispatch({ type: 'ROUTINE_ADDED', routine, programId });
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    dispatch({ type: 'ROUTINE_DELETED', id });
  }, []);

  const getRoutineById = useCallback(
    (id: string) => state.routines.find(r => r.id === id),
    [state.routines],
  );

  const getRoutinesForProgram = useCallback(
    (programId: string): Routine[] => {
      const program = state.programs.find(p => p.id === programId);
      if (!program) return [];
      return program.routineIds
        .map(rid => state.routines.find(r => r.id === rid))
        .filter((r): r is Routine => r !== undefined);
    },
    [state.programs, state.routines],
  );

  return (
    <ProgramsContext.Provider
      value={{
        programs: state.programs,
        routines: state.routines,
        loading: state.loading,
        addProgram,
        deleteProgram,
        addRoutine,
        deleteRoutine,
        getRoutineById,
        getRoutinesForProgram,
      }}
    >
      {children}
    </ProgramsContext.Provider>
  );
}

/** Hook para consumir el contexto de programas y rutinas */
export function usePrograms() {
  const ctx = useContext(ProgramsContext);
  if (!ctx) throw new Error('usePrograms debe usarse dentro de ProgramsProvider');
  return ctx;
}
