import type { Equipment } from '../types/equipment';
import { supabase } from './supabase';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const EQUIPMENT_SELECT = `
  id,
  code,
  name,
  category_id,
  location,
  description,
  image_path,
  lifecycle_status,
  created_at
`;

export type EquipmentInput = {
  code: string;
  name: string;
  categoryId: string;
  location: string;
  description?: string;
};

export type GetEquipmentParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  startAt?: string;
  endAt?: string;
  availableOnly?: boolean;
};

export const equipmentService = {
  async getEquipment({
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    search = '',
    categoryId,
    startAt,
    endAt,
    availableOnly = false,
  }: GetEquipmentParams = {}) {
    const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;

    const normalizedPageSize = Number.isFinite(pageSize)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))
      : DEFAULT_PAGE_SIZE;

    if ((startAt == null) !== (endAt == null)) {
      return {
        data: null,
        count: null,
        error: new Error(
          'Müsaitlik kontrolü için başlangıç ve bitiş zamanı birlikte seçilmelidir.',
        ),
      };
    }

    if (startAt && endAt && startAt >= endAt) {
      return {
        data: null,
        count: null,
        error: new Error('Başlangıç zamanı bitiş zamanından önce olmalıdır.'),
      };
    }

    if (availableOnly && (!startAt || !endAt)) {
      return {
        data: null,
        count: null,
        error: new Error('Müsaitlik filtresi için başlangıç ve bitiş zamanı seçin.'),
      };
    }

    const { data, error } = await supabase.rpc('get_equipment_catalog', {
      p_page: normalizedPage,
      p_page_size: normalizedPageSize,
      p_search: search.trim(),
      p_category_id: categoryId?.trim() || null,
      p_start_at: startAt ?? null,
      p_end_at: endAt ?? null,
      p_available_only: availableOnly,
    });

    if (error) {
      return {
        data: null,
        count: null,
        error,
      };
    }

    type EquipmentCatalogRow = {
      id: string;
      code: string;
      name: string;
      category_id: string;
      location: string;
      description: string | null;
      image_path: string | null;
      lifecycle_status: Equipment['lifecycle_status'];
      created_at: string;
      category_name: string | null;
      is_available: boolean;
      total_count: number;
    };

    const rows = (data ?? []) as EquipmentCatalogRow[];
    const count = Number(rows[0]?.total_count ?? 0);

    const equipment: Equipment[] = rows.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category_id: item.category_id,
      location: item.location,
      description: item.description,
      image_path: item.image_path,
      lifecycle_status: item.lifecycle_status,
      created_at: item.created_at,
      categories: item.category_name
        ? [
            {
              id: item.category_id,
              name: item.category_name,
            },
          ]
        : [],
      is_available: item.is_available,
    }));

    return {
      data: equipment,
      count,
      error: null,
    };
  },

  async getEquipmentDetail(equipmentId: string) {
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(EQUIPMENT_SELECT)
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

  async getEquipmentByCode(code: string) {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      return {
        data: null,
        error: new Error('Lütfen geçerli bir ekipman kodu girin.'),
      };
    }

    const { data, error } = await supabase
      .from('equipment')
      .select('id, code, name, lifecycle_status')
      .eq('code', normalizedCode)
      .maybeSingle();

    return {
      data,
      error,
    };
  },

  async getActiveCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return {
      data,
      error,
    };
  },

  async createEquipment(input: EquipmentInput) {
    const code = input.code.trim();
    const name = input.name.trim();
    const location = input.location.trim();
    const description = input.description?.trim() || null;

    if (!code || !name || !location || !input.categoryId) {
      return {
        data: null,
        error: new Error('Ekipman kodu, adı, kategorisi ve konumu zorunludur.'),
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

    return {
      data,
      error,
    };
  },

  async updateEquipment(equipmentId: string, input: EquipmentInput) {
    const code = input.code.trim();
    const name = input.name.trim();
    const location = input.location.trim();
    const description = input.description?.trim() || null;

    if (!code || !name || !location || !input.categoryId) {
      return {
        data: null,
        error: new Error('Ekipman kodu, adı, kategorisi ve konumu zorunludur.'),
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

    return {
      data,
      error,
    };
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
      return {
        data: null,
        error,
      };
    }

    return {
      data: true,
      error: null,
    };
  },
};
