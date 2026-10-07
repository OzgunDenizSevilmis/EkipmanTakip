import { supabase } from './supabase';

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
      return {
        data: null,
        error: equipmentError,
      };
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
          categories: [],
        })),
        error: null,
      };
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (categoriesError) {
      return {
        data: null,
        error: categoriesError,
      };
    }

    const equipmentWithCategories = (equipment ?? []).map((item) => ({
      ...item,
      categories: (categories ?? []).filter(
        (category) => category.id === item.category_id,
      ),
    }));

    return {
      data: equipmentWithCategories,
      error: null,
    };
    
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
      return {
        data: null,
        error: equipmentError,
      };
    }

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', equipment.category_id)
      .maybeSingle();

    if (categoryError) {
      return {
        data: null,
        error: categoryError,
      };
    }

    return {
      data: {
        ...equipment,
        category: category ?? null,
      },
      error: null,
    };
  },
};
     


