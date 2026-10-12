
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminEquipmentScreen } from '../screens/admin/AdminEquipmentScreen';

import { AdminMaintenanceScreen } from '../screens/admin/AdminMaintenanceScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';
import EquipmentDetailScreen from '../screens/app/EquipmentDetailScreen';
import ReservationFormScreen from '../screens/app/ReservationFormScreen';
import { MainTabs } from './MainTabs';

export type AppStackParamList = {
  Main: undefined;
  EquipmentDetail: {
    equipmentId: string;
  };
  ReservationForm: {
    equipmentId: string;
  };
  AdminReservations: undefined;
  AdminMaintenance: undefined;
  AdminEquipment: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EquipmentDetail"
        component={EquipmentDetailScreen}
        options={{ title: 'Ekipman Detayı' }}
      />

      <Stack.Screen
        name="ReservationForm"
        component={ReservationFormScreen}
        options={{ title: 'Rezervasyon Oluştur' }}
      />

      <Stack.Screen
        name="AdminReservations"
        component={AdminReservationsScreen}
        options={{ title: 'Rezervasyon Yönetimi' }}
      />

      <Stack.Screen
        name="AdminMaintenance"
        component={AdminMaintenanceScreen}
        options={{ title: 'Bakım Yönetimi' }}
      />
      <Stack.Screen
  name="AdminEquipment"
  component={AdminEquipmentScreen}
  options={{ title: 'Ekipman Yönetimi' }}
/>
    </Stack.Navigator>
  );
}
