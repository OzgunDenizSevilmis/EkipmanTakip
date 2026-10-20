import { supabase } from './supabase';

import type { Category, CategoryInput } from '../types/category';

type CategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
  };
}

function validateCategoryName(name: string): string | null {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return 'Kategori adı boş bırakılamaz.';
  }

  if (normalizedName.length > 100) {
    return 'Kategori adı en fazla 100 karakter olabilir.';
  }

  return null;
}

export const categoryService = {
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, is_active')
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return {
      data: (data ?? []).map((row) => mapCategory(row as CategoryRow)),
      error: null,
    };
  },

  async createCategory(input: CategoryInput) {
    const name = input.name.trim();
    const validationError = validateCategoryName(name);

    if (validationError) {
      return {
        data: null,
        error: new Error(validationError),
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name })
      .select('id, name, is_active')
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapCategory(data as CategoryRow),
      error: null,
    };
  },

  async updateCategory(categoryId: string, input: CategoryInput) {
    const name = input.name.trim();
    const validationError = validateCategoryName(name);

    if (validationError) {
      return {
        data: null,
        error: new Error(validationError),
      };
    }

    if (!categoryId.trim()) {
      return {
        data: null,
        error: new Error('Düzenlenecek kategori seçilmedi.'),
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', categoryId)
      .select('id, name, is_active')
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapCategory(data as CategoryRow),
      error: null,
    };
  },

  async setCategoryActive(categoryId: string, isActive: boolean) {
    if (!categoryId.trim()) {
      return {
        data: null,
        error: new Error('Durumu değiştirilecek kategori seçilmedi.'),
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: isActive })
      .eq('id', categoryId)
      .select('id, name, is_active')
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: mapCategory(data as CategoryRow),
      error: null,
    };
  },
};