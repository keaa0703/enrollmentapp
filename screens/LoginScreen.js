import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Switch,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";


const { height } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [idOrEmail, setIdOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  

  useEffect(() => {
    const loadStoredCredentials = async () => {
      const savedId = await AsyncStorage.getItem("rememberedId");
      if (savedId) {
        setIdOrEmail(savedId);
        setRememberMe(true);
      }
    };
    loadStoredCredentials();
  }, []);

 

  const handleLogin = async () => {
    if (!idOrEmail || !password) {
      Alert.alert("Missing Fields", "Please enter both ID/Email and Password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.3:5003/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: idOrEmail, password }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.role === "student") {
        await AsyncStorage.setItem("studentId", data.studentId);
        await AsyncStorage.setItem("studentEmail", data.email);
        await AsyncStorage.setItem("studentDocId", data.studentDocId);

        if (rememberMe) {
          await AsyncStorage.setItem("rememberedId", idOrEmail);
        } else {
          await AsyncStorage.removeItem("rememberedId");
        }

        Alert.alert("Login Successful", "Welcome back!");
        navigation.navigate("StudentDashboardScreen", {
          studentId: data.studentId,
          email: data.email,
        });
      } else {
        Alert.alert("Login Failed", data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login Error:", err);
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyNow = () => navigation.navigate("ApplicationFormScreen");
  const handleForgotPassword = () => navigation.navigate("ForgotPasswordScreen");

  return (
    <ImageBackground
      source={{
        uri: "https://npuc.adventist.ph/wp-content/uploads/2024/08/Institutions-Images-2.jpg",
      }}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={50}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Welcome to EnrollEase</Text>
            <Text style={styles.subtitle}>Your easy way to enroll</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#555" style={styles.icon} />
              <TextInput
                placeholder="Email or Student ID"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setIdOrEmail}
                value={idOrEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#555" style={styles.icon} />
              <TextInput
                placeholder="Password"
                style={styles.input}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.rememberRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Switch value={rememberMe} onValueChange={setRememberMe} />
                <Text style={styles.rememberText}>Remember Me</Text>
              </View>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Login</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleApplyNow}>
              <Text style={styles.applyNow}>📄 Apply Now</Text>
            </TouchableOpacity>

            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: height,
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffffee",
    padding: 25,
    borderRadius: 16,
    alignItems: "center",
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  rememberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  rememberText: {
    fontSize: 13,
    marginLeft: 8,
  },
  forgotText: {
    color: "#007BFF",
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  applyNow: {
    color: "orange",
    marginTop: 10,
  },
});

export default LoginScreen;
