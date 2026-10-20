
export type EquipmentLifecycleStatus =
  | 'ACTIVE'
  | 'MAINTENANCE'
  | 'INACTIVE';

export type Category = {
  id: string;
  name: string;
  is_active: boolean;
};

export type EquipmentCategory = {
  id: string;
  name: string;
};

export type Equipment = {
  id: string;
  code: string;
  name: string;
  category_id: string;
  location: string;
  description: string | null;
  image_path: string | null;
  lifecycle_status: EquipmentLifecycleStatus;
  categories?: EquipmentCategory[];
  created_at: string;
  is_available?: boolean;
};
