import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import SubscribersNavigator from './SubscribersNavigator';
import BillingScreen from '../screens/BillingScreen';
import MoreScreen from '../screens/MoreScreen';

export type TabParamList = {
  HomeTab: undefined;
  SubscribersTab: undefined;
  BillingTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const icons: Record<string, string> = {
    HomeTab: '🏠',
    SubscribersTab: '👥',
    BillingTab: '💳',
    MoreTab: '☰',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({focused}) => <TabIcon name={route.name} focused={focused} />,
      })}>
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="SubscribersTab"
        component={SubscribersNavigator}
        options={{tabBarLabel: 'Subscribers'}}
      />
      <Tab.Screen
        name="BillingTab"
        component={BillingScreen}
        options={{tabBarLabel: 'Billing'}}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{tabBarLabel: 'More'}}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
});
