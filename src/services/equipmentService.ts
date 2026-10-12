
import { supabase } from './supabase';

export type EquipmentInput = {
  code: string;
  name: string;
  categoryId: string;
  location: string;
  description?: string;
};

export type Equipment = {
  id: string;
  code: string;
  name: string;
  category_id: string;
  location: string;
  description: string | null;
  image_path: string | null;
  lifecycle_status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  created_at: string;
  categories: {
    id: string;
    name: string;
  }[];
};

export type EquipmentCategory = {
  id: string;
  name: string;
};

export const equipmentService = {
  async getEquipment() {
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(
        `
          id,
          code,
          name,
          category_id,
          location,
          description,
          image_path,
          lifecycle_status,
          created_at
        `,
      )
      .order('created_at', { ascending: false });

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const categoryIds = [
      ...new Set(
        (equipment ?? [])
          .map((item) => item.category_id)
          .filter(Boolean),
      ),
    ];

    if (categoryIds.length === 0) {
      return {
        data: (equipment ?? []).map((item) => ({
          ...item,
          categories: [] as EquipmentCategory[],
        })),
        error: null,
      };
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (categoriesError) {
      return { data: null, error: categoriesError };
    }

    const equipmentWithCategories = (equipment ?? []).map((item) => ({
      ...item,
      categories: (categories ?? []).filter(
        (category) => category.id === item.category_id,
      ),
    }));

    return { data: equipmentWithCategories, error: null };
  },

  async getEquipmentDetail(equipmentId: string) {
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(
        `
          id,
          code,
          name,
          category_id,
          location,
          description,
          image_path,
          lifecycle_status,
          created_at
        `,
      )
      .eq('id', equipmentId)
      .single();

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', equipment.category_id)
      .maybeSingle();

    if (categoryError) {
      return { data: null, error: categoryError };
    }

    return {
      data: {
        ...equipment,
        category: category ?? null,
      },
      error: null,
    };
  },

  async getActiveCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return { data, error };
  },

  async createEquipment(input: EquipmentInput) {
    const code = input.code.trim();
    const name = input.name.trim();
    const location = input.location.trim();
    const description = input.description?.trim() || null;

    if (!code || !name || !location || !input.categoryId) {
      return {
        data: null,
        error: new Error(
          'Ekipman kodu, adı, kategorisi ve konumu zorunludur.',
        ),
      };
    }

    const { data, error } = await supabase
      .from('equipment')
      .insert({
        code,
        name,
        category_id: input.categoryId,
        location,
        description,
        lifecycle_status: 'ACTIVE',
      })
      .select()
      .single();

    return { data, error };
  },

  async updateEquipment(
    equipmentId: string,
    input: EquipmentInput,
  ) {
    const code = input.code.trim();
    const name = input.name.trim();
    const location = input.location.trim();
    const description = input.description?.trim() || null;

    if (!code || !name || !location || !input.categoryId) {
      return {
        data: null,
        error: new Error(
          'Ekipman kodu, adı, kategorisi ve konumu zorunludur.',
        ),
      };
    }

    const { data, error } = await supabase
      .from('equipment')
      .update({
        code,
        name,
        category_id: input.categoryId,
        location,
        description,
      })
      .eq('id', equipmentId)
      .select()
      .single();

    return { data, error };
  },

  async deactivateEquipment(equipmentId: string) {
    if (!equipmentId.trim()) {
      return {
        data: null,
        error: new Error('Pasife alınacak ekipman seçilmedi.'),
      };
    }

    const { error } = await supabase.rpc('deactivate_equipment', {
      p_equipment_id: equipmentId,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  },
};
