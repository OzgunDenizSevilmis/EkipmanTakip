export type ReservationStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'DELIVERED' | 'COMPLETED';

export type Reservation = {
  id: string;
  equipment_id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  purpose: string;
  status: ReservationStatus;
  rejection_reason: string | null;
  version: number;
  created_at: string;
};
