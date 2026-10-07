import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EquipmentDetailScreen from '../screens/app/EquipmentDetailScreen';
import { MainTabs } from './MainTabs';

export type AppStackParamList = {
  Main: undefined;
  EquipmentDetail: {
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
    </Stack.Navigator>
  );
}