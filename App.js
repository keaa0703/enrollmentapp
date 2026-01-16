import { decode as atob, encode as btoa } from "base-64";


// Polyfill for React Native (adds global atob/btoa)
if (typeof global.atob === "undefined") global.atob = atob;
if (typeof global.btoa === "undefined") global.btoa = btoa;

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
