import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminEquipmentScreen } from '../screens/admin/AdminEquipmentScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminLoansScreen from '../screens/admin/AdminLoansScreen';
import { AdminMaintenanceScreen } from '../screens/admin/AdminMaintenanceScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';
import EquipmentDetailScreen from '../screens/app/EquipmentDetailScreen';
import ReservationFormScreen from '../screens/app/ReservationFormScreen';
import QRScannerScreen from '../screens/app/QRScannerScreen';
import NotificationsScreen from '../screens/app/AppNotificationsScreen';
import { MainTabs } from './MainTabs';

export type AppStackParamList = {
  Main: undefined;
  EquipmentDetail: { equipmentId: string };
  ReservationForm: { equipmentId: string };
  QRScanner: undefined;
  AdminReservations: { equipmentId?: string } | undefined;
  AdminMaintenance: undefined;
  AdminEquipment: undefined;
  AdminLoans: undefined;
  AdminCategories: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

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
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: 'QR Kod Okut' }}
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

      <Stack.Screen
        name="AdminLoans"
        component={AdminLoansScreen}
        options={{ title: 'Zimmet Yönetimi' }}
      />

      <Stack.Screen
        name="AdminCategories"
        component={AdminCategoriesScreen}
        options={{ title: 'Kategori Yönetimi' }}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Bildirimler' }}
      />
    </Stack.Navigator>
  );
}
