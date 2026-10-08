import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EquipmentDetailScreen from '../screens/app/EquipmentDetailScreen';
import { MainTabs } from './MainTabs';
import ReservationFormScreen from '../screens/app/ReservationFormScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';

export type AppStackParamList = {
  Main: undefined;
  EquipmentDetail: {
    equipmentId: string;
  };
  ReservationForm: {
    equipmentId: string;
  };
  AdminReservations: undefined;
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
    </Stack.Navigator>
  );
}