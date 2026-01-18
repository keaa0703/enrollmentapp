import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen'; 
import ApplicationFormScreen from '../screens/ApplicationFormScreen';
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import { StackScreen } from 'react-native-screens';






const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}} />
      <Stack.Screen name="ApplicationFormScreen" component={ApplicationFormScreen} options={{headerShown:false}} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{headerShown:false}} />
      <Stack.Screen name="StudentDashboardScreen" component={StudentDashboardScreen}options={{headerShown:false}} />
       </Stack.Navigator>
    
  );
}
