import { supabase } from './supabase';

export const notificationService = {
  async getMyNotifications() {
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

    console.log('Giriş yapan kullanıcı ID:', user.id);

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        entity_type,
        entity_id,
        message,
        read_at,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('Bildirim kayıtları:', data);
    console.log('Bildirim sorgu hatası:', error);

    if (error) {
      return { data: null, error };
    }

    return { data: data ?? [], error: null };
  },

  async markAsRead(notificationId: string) {
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
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .is('read_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  },
};