import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import StaffListScreen from '../screens/human-resources/StaffListScreen';
import StaffFormScreen from '../screens/human-resources/StaffFormScreen';

const Stack = createNativeStackNavigator();

export default function HumanResourcesNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="StaffList" component={StaffListScreen} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} />
    </Stack.Navigator>
  );
}
