import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { EquipmentScreen } from '../screens/app/EquipmentScreen';
import { HomeScreen } from '../screens/app/HomeScreen';
import { MyActionsScreen } from '../screens/app/MyActionsScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';

export type MainTabParamList = {
  Home: undefined;
  Equipment: undefined;
  MyActions: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Ana Sayfa', tabBarLabel: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="Equipment"
        component={EquipmentScreen}
        options={{ title: 'Ekipmanlar', tabBarLabel: 'Ekipmanlar' }}
      />
      <Tab.Screen
        name="MyActions"
        component={MyActionsScreen}
        options={{ title: 'İşlemlerim', tabBarLabel: 'İşlemlerim' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}