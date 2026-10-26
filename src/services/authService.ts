import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  },
  async resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'ekipmantakip://reset-password',
    });
  },

  async getSession() {
    return supabase.auth.getSession();
  },
  async setSession(accessToken: string, refreshToken: string) {
    return supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  },

  async updatePassword(password: string) {
    return supabase.auth.updateUser({
      password,
    });
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
  async getCurrentProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return {
        data: null,
        error: userError,
      };
    }

    if (!user) {
      return {
        data: null,
        error: new Error('Oturum açmış kullanıcı bulunamadı.'),
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single();

    return {
      data,
      error,
    };
  },
};
