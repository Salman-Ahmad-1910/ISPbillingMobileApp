import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CompanySelectScreen from '../screens/CompanySelectScreen';
import DrawerNavigator from './DrawerNavigator';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
};

export type MainStackParamList = {
  CompanySelect: undefined;
  MainApp: undefined;
  MainTabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const {companyId} = useAuth();

  return (
    <MainStack.Navigator screenOptions={{headerShown: false}}>
      {!companyId ? (
        <MainStack.Screen name="CompanySelect" component={CompanySelectScreen} />
      ) : (
        <MainStack.Screen name="MainApp">
          {() => <DrawerNavigator key={companyId} />}
        </MainStack.Screen>
      )}
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const {isLoading, isAuthenticated} = useAuth();

  if (isLoading) {
    return (
      <GestureHandlerRootView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F2937" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});
