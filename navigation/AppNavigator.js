import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen'; 
import ApplicationFormScreen from '../screens/ApplicationFormScreen';
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import UpdateProfileScreen from '../screens/UpdateProfileScreen';
import EnrollmentFormScreen from '../screens/EnrollmentFormScreen';






const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ApplicationFormScreen" component={ApplicationFormScreen} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
      <Stack.Screen name="StudentDashboardScreen" component={StudentDashboardScreen} />
      <Stack.Screen name="UpdateProfileScreen" component={UpdateProfileScreen} />

    </Stack.Navigator>
    
  );
}
