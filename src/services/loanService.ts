import { supabase } from './supabase';

export const loanService = {
  async getMyLoans() {
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

    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id,
        reservation_id,
        equipment_id,
        user_id,
        checked_out_at,
        due_at,
        returned_at,
        delivery_note,
        return_note,
        condition
      `)
      .eq('user_id', user.id)
      .order('checked_out_at', { ascending: false });

    if (loansError) {
      return { data: null, error: loansError };
    }

    const equipmentIds = [
      ...new Set((loans ?? []).map((loan) => loan.equipment_id)),
    ];

    if (equipmentIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, code')
      .in('id', equipmentIds);

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const loansWithEquipment = (loans ?? []).map((loan) => ({
      ...loan,
      equipment:
        equipment?.find((item) => item.id === loan.equipment_id) ?? null,
    }));

    return { data: loansWithEquipment, error: null };
  },
};