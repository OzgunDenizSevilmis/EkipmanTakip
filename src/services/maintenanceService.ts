
import { supabase } from './supabase';

export type MaintenanceRecord = {
  id: string;
  equipment_id: string;
  description: string;
  opened_at: string;
  closed_at: string | null;
  created_by: string;
  equipment: {
    id: string;
    name: string;
    code: string;
    lifecycle_status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  } | null;
};

type StartMaintenanceInput = {
  equipmentId: string;
  description: string;
};

export const maintenanceService = {
  async getMaintenanceRecords() {
    const { data: records, error: recordsError } = await supabase
      .from('maintenance')
      .select(
        'id, equipment_id, description, opened_at, closed_at, created_by',
      )
      .order('opened_at', { ascending: false });

    if (recordsError) {
      return { data: null, error: recordsError };
    }

    const equipmentIds = [
      ...new Set((records ?? []).map((record) => record.equipment_id)),
    ];

    if (equipmentIds.length === 0) {
      return {
        data: [] as MaintenanceRecord[],
        error: null,
      };
    }

    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, code, lifecycle_status')
      .in('id', equipmentIds);

    if (equipmentError) {
      return { data: null, error: equipmentError };
    }

    const recordsWithEquipment: MaintenanceRecord[] = (records ?? []).map(
      (record) => ({
        ...record,
        equipment:
          equipment?.find((item) => item.id === record.equipment_id) ?? null,
      }),
    );

    return { data: recordsWithEquipment, error: null };
  },

  async startMaintenance({ equipmentId, description }: StartMaintenanceInput) {
    const { data, error } = await supabase.rpc('start_maintenance', {
      p_equipment_id: equipmentId,
      p_description: description.trim(),
    });

    return { data, error };
  },

  async completeMaintenance(maintenanceId: string) {
    const { data, error } = await supabase.rpc('complete_maintenance', {
      p_maintenance_id: maintenanceId,
    });

    return { data, error };
  },
};
