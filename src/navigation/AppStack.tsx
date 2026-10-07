import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EquipmentDetailScreen from '../screens/app/EquipmentDetailScreen';
import { MainTabs } from './MainTabs';
import ReservationFormScreen from '../screens/app/ReservationFormScreen';


export type AppStackParamList = {
  Main: undefined;
  EquipmentDetail: {
    equipmentId: string;
  };
  ReservationForm: {
    equipmentId: string;
  };
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
    </Stack.Navigator>
  );
}