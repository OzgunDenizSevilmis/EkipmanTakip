import { supabase } from './supabase';

type CreateReservationInput = {
  equipmentId: string;
  startAt: string;
  endAt: string;
  purpose: string;
};

type DeliverEquipmentInput = {
  reservationId: string;
  condition: string;
  deliveryNote?: string;
};

type ReturnEquipmentInput = {
  reservationId: string;
  condition: string;
  returnNote?: string;
};

export const reservationService = {
  async getMyReservations() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return {
        data: null,
        error: new Error('Oturum açmış kullanıcı bulunamadı.'),
      };
    }

    const { data: reservations, error: reservationsError } =
      await supabase
        .from('reservations')
        .select(`
          id,
          equipment_id,
          user_id,
          start_at,
          end_at,
          purpose,
          status,
          rejection_reason,
          version,
          created_at
        `)
        .eq('user_id', user.id)
        .order('start_at', { ascending: false });

    if (reservationsError) {
      return { data: null, error: reservationsError };
    }

    const equipmentIds = [
      ...new Set(
        (reservations ?? [])
          .map((reservation) => reservation.equipment_id)
          .filter(Boolean),
      ),
    ];

    if (equipmentIds.length === 0) {
      return { data: reservations ?? [], error: null };
    }

    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, code')
      .in('id', equipmentIds);

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const reservationsWithEquipment = (reservations ?? []).map(
      (reservation) => ({
        ...reservation,
        equipment:
          equipment?.find(
            (item) => item.id === reservation.equipment_id,
          ) ?? null,
      }),
    );

    return { data: reservationsWithEquipment, error: null };
  },

  async createReservation({
    equipmentId,
    startAt,
    endAt,
    purpose,
  }: CreateReservationInput) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { data: null, error: userError };
    }

    if (!user) {
      return {
        data: null,
        error: new Error('Oturum açmış kullanıcı bulunamadı.'),
      };
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        equipment_id: equipmentId,
        user_id: user.id,
        start_at: startAt,
        end_at: endAt,
        purpose,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23P01') {
        return {
          data: null,
          error: new Error(
            'Bu ekipman seçtiğin tarih ve saatlerde başka bir rezervasyona sahip.',
          ),
        };
      }

      return { data: null, error };
    }

    return { data, error: null };
  },

  async getAllReservations() {
    const { data: reservations, error: reservationsError } =
      await supabase
        .from('reservations')
        .select(`
          id,
          equipment_id,
          user_id,
          start_at,
          end_at,
          purpose,
          status,
          rejection_reason,
          version,
          created_at
        `)
        .order('start_at', { ascending: false });

    if (reservationsError) {
      return { data: null, error: reservationsError };
    }

    const equipmentIds = [
      ...new Set(
        (reservations ?? [])
          .map((reservation) => reservation.equipment_id)
          .filter(Boolean),
      ),
    ];

    if (equipmentIds.length === 0) {
      return { data: reservations ?? [], error: null };
    }

    const { data: equipment, error: equipmentError } =
      await supabase
        .from('equipment')
        .select('id, name, code')
        .in('id', equipmentIds);

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const reservationsWithEquipment = (reservations ?? []).map(
      (reservation) => ({
        ...reservation,
        equipment:
          equipment?.find(
            (item) => item.id === reservation.equipment_id,
          ) ?? null,
      }),
    );

    return { data: reservationsWithEquipment, error: null };
  },

  async approveReservation(reservationId: string) {
    const { data, error } = await supabase.rpc(
      'approve_reservation',
      {
        p_reservation_id: reservationId,
      },
    );

    return { data, error };
  },

  async rejectReservation(
    reservationId: string,
    rejectionReason: string,
  ) {
    const { data, error } = await supabase.rpc(
      'reject_reservation',
      {
        p_reservation_id: reservationId,
        p_rejection_reason: rejectionReason,
      },
    );

    return { data, error };
  },

  async deliverEquipment({
    reservationId,
    condition,
    deliveryNote,
  }: DeliverEquipmentInput) {
    const { data, error } = await supabase.rpc(
      'deliver_equipment',
      {
        p_reservation_id: reservationId,
        p_condition: condition,
        p_delivery_note: deliveryNote?.trim() || null,
      },
    );

    return { data, error };
  },

  async returnEquipment({
    reservationId,
    condition,
    returnNote,
  }: ReturnEquipmentInput) {
    const { data, error } = await supabase.rpc(
      'return_equipment',
      {
        p_reservation_id: reservationId,
        p_condition: condition,
        p_return_note: returnNote?.trim() || null,
      },
    );

    return { data, error };
  },
};