
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CalendarCheck,
  House,
  Package,
  UserRound,
} from 'lucide-react-native';

import { EquipmentScreen } from '../screens/app/EquipmentScreen';
import { HomeScreen } from '../screens/app/HomeScreen';
import { MyActionsScreen } from '../screens/app/MyActionsScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { colors } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Equipment: undefined;
  MyActions: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, size, focused }) => (
            <House
              color={color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Equipment"
        component={EquipmentScreen}
        options={{
          title: 'Ekipmanlar',
          tabBarLabel: 'Ekipmanlar',
          tabBarIcon: ({ color, size, focused }) => (
            <Package
              color={color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      <Tab.Screen
        name="MyActions"
        component={MyActionsScreen}
        options={{
          title: 'İşlemlerim',
          tabBarLabel: 'İşlemlerim',
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarCheck
              color={color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <UserRound
              color={color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
