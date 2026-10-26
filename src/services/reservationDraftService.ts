
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReservationDraft = {
  startAt: string;
  endAt: string;
  purpose: string;
  updatedAt: string;
};

function getDraftKey(userId: string, equipmentId: string) {
  return `reservation-draft:${userId}:${equipmentId}`;
}

export const reservationDraftService = {
  async get(
    userId: string,
    equipmentId: string,
  ): Promise<ReservationDraft | null> {
    const key = getDraftKey(userId, equipmentId);
    const storedDraft = await AsyncStorage.getItem(key);

    if (!storedDraft) {
      return null;
    }

    try {
      const draft = JSON.parse(storedDraft) as ReservationDraft;

      if (
        typeof draft.startAt !== 'string' ||
        typeof draft.endAt !== 'string' ||
        typeof draft.purpose !== 'string' ||
        Number.isNaN(Date.parse(draft.startAt)) ||
        Number.isNaN(Date.parse(draft.endAt))
      ) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return draft;
    } catch {
      await AsyncStorage.removeItem(key);
      return null;
    }
  },

  async save(
    userId: string,
    equipmentId: string,
    draft: Omit<ReservationDraft, 'updatedAt'>,
  ): Promise<void> {
    const key = getDraftKey(userId, equipmentId);

    const value: ReservationDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async clear(userId: string, equipmentId: string): Promise<void> {
    await AsyncStorage.removeItem(getDraftKey(userId, equipmentId));
  },
};
