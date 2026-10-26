import { supabase } from './supabase';

async function getLoansWithDetails(userId?: string) {
  let query = supabase
    .from('loans')
    .select(
      `
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
    `,
    )
    .order('checked_out_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: loans, error: loansError } = await query;

  if (loansError) {
    return { data: null, error: loansError };
  }

  const records = loans ?? [];

  if (records.length === 0) {
    return { data: [], error: null };
  }

  const equipmentIds = [...new Set(records.map((loan) => loan.equipment_id))];
  const userIds = [...new Set(records.map((loan) => loan.user_id))];

  const [{ data: equipment, error: equipmentError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('equipment').select('id, name, code').in('id', equipmentIds),
      supabase.from('profiles').select('id, full_name').in('id', userIds),
    ]);

  if (equipmentError) {
    return { data: null, error: equipmentError };
  }

  if (profilesError) {
    return { data: null, error: profilesError };
  }

  const data = records.map((loan) => ({
    ...loan,
    equipment: equipment?.find((item) => item.id === loan.equipment_id) ?? null,
    profile: profiles?.find((item) => item.id === loan.user_id) ?? null,
  }));

  return { data, error: null };
}

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

    return getLoansWithDetails(user.id);
  },

  async getAllLoans() {
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

    return getLoansWithDetails();
  },
};
