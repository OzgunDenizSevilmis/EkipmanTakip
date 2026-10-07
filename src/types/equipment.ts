export type EquipmentLifecycleStatus =
  | 'ACTIVE'
  | 'MAINTENANCE'
  | 'INACTIVE';

export type Category = {
  id: string;
  name: string;
  is_active: boolean;
};

export type Equipment = {
  id: string;
  code: string;
  name: string;
  category_id: string;
  location: string;
  description: string;
  image_path: string;
  lifecycle_status: EquipmentLifecycleStatus;
  categories?: {
    id: string;
    name: string;
  }[];
  
  created_at: string;
};
