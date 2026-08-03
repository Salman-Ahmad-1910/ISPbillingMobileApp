import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SubscriberListScreen from '../screens/subscribers/SubscriberListScreen';
import SubscriberDetailScreen from '../screens/subscribers/SubscriberDetailScreen';
import SubscriberFormScreen from '../screens/subscribers/SubscriberFormScreen';
import InquiriesScreen from '../screens/subscribers/InquiriesScreen';
import CorporateScreen from '../screens/subscribers/CorporateScreen';

export type SubscribersStackParamList = {
  SubscriberList: undefined;
  SubscriberDetail: {id: string};
  SubscriberForm: {subscriber?: any};
  Inquiries: undefined;
  Corporate: undefined;
};

const Stack = createNativeStackNavigator<SubscribersStackParamList>();

export default function SubscribersNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SubscriberList" component={SubscriberListScreen} />
      <Stack.Screen name="SubscriberDetail" component={SubscriberDetailScreen} />
      <Stack.Screen name="SubscriberForm" component={SubscriberFormScreen} />
      <Stack.Screen name="Inquiries" component={InquiriesScreen} />
      <Stack.Screen name="Corporate" component={CorporateScreen} />
    </Stack.Navigator>
  );
}
