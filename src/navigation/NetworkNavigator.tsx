import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import NetworkListScreen from '../screens/network/NetworkListScreen';
import NetworkFormScreen from '../screens/network/NetworkFormScreen';
import {ModuleConfig, networkModules} from '../screens/network/networkConfig';

const Stack = createNativeStackNavigator();

function createNetworkNavigator(config: ModuleConfig) {
  return function NetworkModuleNavigator() {
    return (
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen
          name="NetworkList"
          component={NetworkListScreen}
          initialParams={{config}}
        />
        <Stack.Screen
          name="NetworkForm"
          component={NetworkFormScreen}
          initialParams={{config}}
        />
      </Stack.Navigator>
    );
  };
}

export const AreasNavigator = createNetworkNavigator(networkModules.areas);
export const PopsNavigator = createNetworkNavigator(networkModules.pops);
export const OltsNavigator = createNetworkNavigator(networkModules.olts);
export const SplittersNavigator = createNetworkNavigator(networkModules.splitters);
export const BoxesNavigator = createNetworkNavigator(networkModules.boxes);

export type {ModuleConfig};
