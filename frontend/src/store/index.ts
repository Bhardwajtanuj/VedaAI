import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Assignment, FormValues, WsMessage } from '@/types';

interface GenerationState {
  progress: number;
  message: string;
  wsConnected: boolean;
}

interface AppState {
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  generationState: GenerationState;
  form: FormValues;
  errors: Partial<Record<keyof FormValues, string>>;

  setAssignments: (assignments: Assignment[]) => void;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  updateAssignmentStatus: (id: string, updates: Partial<Assignment>) => void;
  setGenerationState: (state: Partial<GenerationState>) => void;
  setFormField: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  setErrors: (errors: Partial<Record<keyof FormValues, string>>) => void;
  clearError: (key: keyof FormValues) => void;
  resetForm: () => void;
  handleWsMessage: (msg: WsMessage, assignmentId: string) => void;
}

const defaultForm: FormValues = {
  title: '',
  subject: '',
  dueDate: '',
  questionTypes: [],
  totalQuestions: '',
  totalMarks: '',
  difficulty: 'medium',
  additionalInstructions: '',
  file: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      assignments: [],
      currentAssignment: null,
      generationState: { progress: 0, message: '', wsConnected: false },
      form: { ...defaultForm },
      errors: {},

      setAssignments: (assignments) => set({ assignments }),

      setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),

      updateAssignmentStatus: (id, updates) => {
        const { assignments, currentAssignment } = get();
        set({
          assignments: assignments.map((a) => (a._id === id ? { ...a, ...updates } : a)),
          currentAssignment: currentAssignment?._id === id
            ? { ...currentAssignment, ...updates }
            : currentAssignment,
        });
      },

      setGenerationState: (state) =>
        set((prev) => ({ generationState: { ...prev.generationState, ...state } })),

      setFormField: (key, value) =>
        set((prev) => ({ form: { ...prev.form, [key]: value } })),

      setErrors: (errors) => set({ errors }),

      clearError: (key) =>
        set((prev) => {
          const next = { ...prev.errors };
          delete next[key];
          return { errors: next };
        }),

      resetForm: () => set({ form: { ...defaultForm }, errors: {} }),

      handleWsMessage: (msg, assignmentId) => {
        if (msg.type === 'connected') {
          set((prev) => ({ generationState: { ...prev.generationState, wsConnected: true } }));
        } else if (msg.type === 'progress' || msg.type === 'status') {
          set((prev) => ({
            generationState: {
              ...prev.generationState,
              progress: msg.progress ?? prev.generationState.progress,
              message: msg.message ?? prev.generationState.message,
            },
          }));
        } else if (msg.type === 'completed') {
          set((prev) => ({
            generationState: { ...prev.generationState, progress: 100, message: 'Complete!' },
          }));
          get().updateAssignmentStatus(assignmentId, {
            status: 'completed',
            result: msg.result,
          });
        } else if (msg.type === 'failed') {
          get().updateAssignmentStatus(assignmentId, {
            status: 'failed',
            error: msg.error,
          });
        }
      },
    }),
    { name: 'veda-ai-store' }
  )
);
