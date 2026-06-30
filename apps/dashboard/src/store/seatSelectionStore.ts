import { create } from 'zustand';

interface SeatSelectionState {
  eventId: string | null;
  selectedSeatCodes: string[];
  setEventId: (eventId: string) => void;
  toggleSeat: (seatCode: string, maxSelectable?: number) => void;
  clearSelection: () => void;
}

const MAX_SEATS_DEFAULT = 8;

export const useSeatSelectionStore = create<SeatSelectionState>((set, get) => ({
  eventId: null,
  selectedSeatCodes: [],

  setEventId: (eventId) => {
    // Switching events should never carry over a stale selection from a
    // different seat map.
    if (get().eventId !== eventId) {
      set({ eventId, selectedSeatCodes: [] });
    }
  },

  toggleSeat: (seatCode, maxSelectable = MAX_SEATS_DEFAULT) => {
    const current = get().selectedSeatCodes;
    if (current.includes(seatCode)) {
      set({ selectedSeatCodes: current.filter((code) => code !== seatCode) });
    } else if (current.length < maxSelectable) {
      set({ selectedSeatCodes: [...current, seatCode] });
    }
  },

  clearSelection: () => set({ selectedSeatCodes: [], eventId: null }),
}));
