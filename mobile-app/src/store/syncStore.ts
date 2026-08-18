import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export interface IOfflineAction {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'UPDATE_TASK_STATUS' | 'TOGGLE_SUBTASK';
  data: any;
  timestamp: number;
}

interface SyncState {
  offlineQueue: IOfflineAction[];
  isSyncing: boolean;
  addOfflineAction: (type: IOfflineAction['type'], data: any) => void;
  syncOfflineActions: () => Promise<void>;
  clearQueue: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      offlineQueue: [],
      isSyncing: false,

      addOfflineAction: (type, data) => {
        const newAction: IOfflineAction = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          data,
          timestamp: Date.now(),
        };
        set((state) => ({
          offlineQueue: [...state.offlineQueue, newAction],
        }));
        console.log(`Action of type ${type} queued for offline synchronization.`);
      },

      syncOfflineActions: async () => {
        const { offlineQueue, isSyncing } = get();
        if (offlineQueue.length === 0 || isSyncing) return;

        set({ isSyncing: true });
        console.log(`Processing ${offlineQueue.length} offline operations...`);

        const remainingQueue = [...offlineQueue];

        for (const action of offlineQueue) {
          try {
            if (action.type === 'CLOCK_IN') {
              await api.post('/attendance/clock-in', action.data);
            } else if (action.type === 'CLOCK_OUT') {
              await api.post('/attendance/clock-out', action.data);
            } else if (action.type === 'UPDATE_TASK_STATUS') {
              const { id, status, notes } = action.data;
              await api.patch(`/tasks/${id}/status`, { status, notes });
            } else if (action.type === 'TOGGLE_SUBTASK') {
              const { taskId, subtaskId, isCompleted } = action.data;
              await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { isCompleted });
            }

            // Successfully processed. Remove from queue.
            remainingQueue.shift();
            set({ offlineQueue: [...remainingQueue] });
          } catch (error) {
            console.error(`Offline sync failed for action: ${action.type}`, error);
            // Halt sync to avoid processing out-of-order logs (preserves consistency)
            break;
          }
        }

        set({ isSyncing: false });
      },

      clearQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: 'trackora-sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
export default useSyncStore;
