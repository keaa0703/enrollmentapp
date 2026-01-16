import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import CheckBox from 'expo-checkbox';

const LoginScreen = ({ navigation }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [idOrEmail, setIdOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Terms and Conditions states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Forgot Password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const openUserGuide = () => {
    Linking.openURL("https://online.mac.edu.ph/static/custom/AIMS-USER-GUIDE.pdf");
  };

  const handleLogin = async () => {
    if (!idOrEmail || !password) {
      Alert.alert("Missing Fields", "Please enter both ID Number and Password.");
      return;
    }

    setLoading(true);

    try {
      const trimmedId = idOrEmail.trim();
      const trimmedPassword = password.trim();
      
      console.log("=== LOGIN ATTEMPT ===");
      console.log("ID entered:", trimmedId);
      console.log("Password entered:", trimmedPassword);

      const studentsRef = collection(db, "students");
      
      // First, let's check if the collection and data exist
      const allStudents = await getDocs(studentsRef);
      console.log("Total students in database:", allStudents.size);
      
      if (allStudents.size === 0) {
        Alert.alert("Database Error", "No students found in database. Please contact admin.");
        setLoading(false);
        return;
      }

      // Show sample data structure
      if (allStudents.docs.length > 0) {
        const sample = allStudents.docs[0].data();
        console.log("Database field names:", Object.keys(sample));
      }

      // Try to find by studentId only first
      const qId = query(studentsRef, where("studentId", "==", trimmedId));
      const idResults = await getDocs(qId);
      console.log("Students found with this ID:", idResults.size);

      if (idResults.size === 0) {
        Alert.alert("Login Failed", "Student ID not found. Please check your ID number.");
        setLoading(false);
        return;
      }

      // Check password
      const foundUser = idResults.docs[0].data();
      console.log("Found user:", foundUser.studentId);
      console.log("Stored password:", foundUser.studentpassword);
      console.log("Passwords match:", foundUser.studentpassword === trimmedPassword);

      if (foundUser.studentpassword !== trimmedPassword) {
        Alert.alert("Login Failed", "Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      // Login successful
      const userData = foundUser;
      console.log("✅ Login successful!");

      await AsyncStorage.setItem("studentIdNumber", userData.studentId || "");
      await AsyncStorage.setItem("studentEmail", userData.email || "");
      await AsyncStorage.setItem(
        "studentName",
        `${userData.firstName || ""} ${userData.lastName || ""}`
      );

      Alert.alert("Login Successful", `Welcome back, ${userData.firstName || "Student"}!`);
      setShowLoginModal(false);
      
      // Clear form
      setIdOrEmail("");
      setPassword("");
      
      navigation.navigate("StudentDashboardScreen", {
        studentData: userData,
        studentId: userData.studentId,
      });
    } catch (error) {
      console.error("❌ Login Error:", error);
      Alert.alert("Login Failed", `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Required", "Please enter your registered email address.");
      return;
    }

    const normalizedEmail = resetEmail.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setResetLoading(true);

    try {
      console.log("📧 Sending reset email to:", normalizedEmail);

      await sendPasswordResetEmail(auth, normalizedEmail);

      Alert.alert(
        "Success ✅",
        "If this email exists in our system, a password reset link has been sent to your inbox.",
        [
          {
            text: "OK",
            onPress: () => {
              setShowForgotPasswordModal(false);
              setResetEmail("");
            }
          }
        ]
      );
    } catch (err) {
      console.error("❌ Forgot Password Error:", err);

      let message = "Something went wrong. Please try again later.";

      switch (err.code) {
        case "auth/user-not-found":
          message = "No account found with this email.";
          break;
        case "auth/invalid-email":
          message = "Invalid email format.";
          break;
        case "auth/network-request-failed":
          message = "Network error. Please check your internet connection.";
          break;
        case "auth/too-many-requests":
          message = "Too many attempts. Try again in a few minutes.";
          break;
      }

      Alert.alert("Error", message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setResetEmail("");
  };

  const handleApplyNow = () => {
    setShowTermsModal(true);
  };

  const handleTermsAcceptance = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    navigation.navigate("ApplicationFormScreen");
  };

  const handleCloseTermsModal = () => {
    setTermsAccepted(false);
    setShowTermsModal(false);
  };

  const renderLoginModal = () => (
    <Modal
      visible={showLoginModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLoginModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.loginModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Student Login</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowLoginModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginForm}>
            <Text style={styles.label}>ID Number</Text>
            <TextInput
              placeholder="Enter your id number"
              style={styles.input}
              onChangeText={setIdOrEmail}
              value={idOrEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter your password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => {
              setShowLoginModal(false);
              setShowForgotPasswordModal(true);
            }}>
              <Text style={styles.forgotText}>Forgot login password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>LOG IN</Text>}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.userGuideLink} 
              onPress={openUserGuide}
            >
              <Text style={styles.userGuideLinkText}>Need help? View User Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderForgotPasswordModal = () => (
    <Modal
      visible={showForgotPasswordModal}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCloseForgotPassword}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordTitle}>Reset password</Text>

          <Text style={styles.forgotPasswordInstructions}>
            Enter your registered email address to receive a password reset link.
          </Text>

          <TextInput
            style={styles.forgotPasswordInput}
            placeholder="Email Address"
            value={resetEmail}
            onChangeText={setResetEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#999"
            autoCorrect={false}
          />

          <View style={styles.forgotPasswordButtons}>
            <TouchableOpacity
              style={styles.forgotCancelButton}
              onPress={handleCloseForgotPassword}
              disabled={resetLoading}
            >
              <Text style={styles.forgotCancelButtonText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.forgotSendButton, resetLoading && { opacity: 0.8 }]}
              onPress={handleResetPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.forgotSendButtonText}>SEND RESET EMAIL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTermsModal = () => (
    <Modal
      visible={showTermsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseTermsModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms and Condition on Data Collection Policy</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseTermsModal}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.termsContent}>
            <Text style={styles.termsText}>
              I hereby attest that all information stated in this form are true and correct to the best of my knowledge. I understand that any concealment, false statement, and/or non-declaration shall constitute fraud, which shall be a ground to file legal action against me, and I waive my rights to institute any case arising from this situation. I have read this form, understood its contents and consent to the processing of my personal data. I understand that my consent does not preclude the existence of other criteria for lawful processing of personal data, and does not waive any of my rights under the Data Privacy Act of 2012 and other applicable laws. I have provided the information herein after having been informed of the purpose for its processing, and I expressly give my consent therefor. I understand that it is my choice as to what information I provide and that the withholding or falsifying of information may act against the best interest of my relationship with Manila Adventist College. I am aware that I can access my personal information on request, and if necessary, correct information that I believe to be inaccurate. I understand that if, in exceptional circumstances, access is denied for legitimate purposes, I will be informed of the cause thereof and the remedies for the same. Furthermore, I warrant that I have: (i) obtained consent from third persons, if any, to disclose their information included in this form; and (ii) informed said third persons of the purpose for the disclosure and collection of information. I will indemnify and hold Manila Adventist College free and harmless from any and all claims arising from the breach of this warranty, for damages, and for actual legal fees to defend such claims, if any. Unless otherwise provided by law or by appropriate College policies we will retain this consent indefinitely for documentation purposes. Where a retention period is provided by law and/or a College policy, all affected records will be securely disposed of after such period.
            </Text>
          </ScrollView>
          
          <View style={styles.termsCheckboxSection}>
            <View style={styles.termsCheckboxRow}>
              <CheckBox
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                color={termsAccepted ? "#006d3c" : undefined}
              />
              <Text style={styles.termsCheckboxText}>
                I hereby read and understand the Data Privacy Consent Policy
              </Text>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={handleCloseTermsModal}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.acceptButton, 
                { backgroundColor: termsAccepted ? "#006d3c" : "#ccc" }
              ]}
              onPress={handleTermsAcceptance}
              disabled={!termsAccepted}
            >
              <Text style={styles.acceptButtonText}>Yes, I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.mainTitle}>EnrollEase</Text>
          <Text style={styles.subtitle}>Manila Adventist College</Text>
          <Text style={styles.tagline}>
            "Equipping Students for Life and Preparing Them for Service"
          </Text>
        </View>

        {/* Portal Cards Section */}
        <View style={styles.portalsSection}>
          {/* Application Portal Card */}
          <View style={styles.portalCard}>
            <Text style={styles.portalTitle}>Application Portal</Text>
            <Text style={styles.portalDescription}>
              Online facility for application, admission, and requirements gathering for new students and transferees.
            </Text>
            <TouchableOpacity style={styles.portalButton} onPress={handleApplyNow}>
              <Text style={styles.portalButtonText}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Student Portal Card */}
          <View style={styles.portalCard}>
            <Text style={styles.portalTitle}>Student Portal</Text>
            <Text style={styles.portalDescription}>
              Access relevant resources, collaboration tools, communication updates, and information for enrolled students.
            </Text>
            <TouchableOpacity 
              style={styles.portalButton} 
              onPress={() => setShowLoginModal(true)}
            >
              <Text style={styles.portalButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerContent}>
            <View style={styles.contactInfo}>
              <Text style={styles.footerAddress}>1975 Corner Donada & San Juan St.,</Text>
              <Text style={styles.footerAddress}>Pasay City, 1300</Text>
              <Text style={styles.footerContact}>Phone: (63 2) 525-9191 to 9198</Text>
              <Text style={styles.footerContact}>Email: info@mac.edu.ph</Text>
            </View>
            <View style={styles.copyrightInfo}>
              <Text style={styles.copyrightTitle}>EnrollEase</Text>
              <Text style={styles.copyrightText}>© Copyright EnrollEase All Rights Reserved</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {renderLoginModal()}
      {renderForgotPasswordModal()}
      {renderTermsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#006d3c" 
  },
  scrollContainer: { 
    flexGrow: 1 
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 10,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black', 
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 20,
    color: "#fff",
    marginBottom: 10,
    fontWeight: "500",
  },
  tagline: {
    fontSize: 15,
    color: "#fff",
    fontStyle: "italic",
    textAlign: "center",
  },

  // Portals Section
  portalsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "#f5f5f5",
    gap: 20,
  },
  portalCard: {
    backgroundColor: "#004d2c",
    borderRadius: 15,
    padding: 30,
    width: "45%",
    minWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  portalDescription: {
    fontSize: 15,
    color: "#d0d0d0",
    lineHeight: 22,
    marginBottom: 25,
  },
  portalButton: {
    backgroundColor: "#e67e22",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  portalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },

  // Footer Section - Updated for better mobile centering
  footerSection: {
    backgroundColor: "#004d2c",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  footerContent: {
    alignItems: "center",
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  contactInfo: {
    alignItems: "center",
    marginBottom: 30,
  },
  footerAddress: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },
  footerContact: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },
  copyrightInfo: {
    alignItems: "center",
  },
  copyrightTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  copyrightText: {
    color: "#d0d0d0",
    fontSize: 13,
    textAlign: "center",
  },

  // Login Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loginModalContainer: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 15,
    width: "90%",
    maxWidth: 450,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
    marginTop: -3,
  },
  loginForm: {
    padding: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  forgotText: {
    color: "#e67e22",
    marginBottom: 20,
    fontSize: 14,
    textAlign: "right",
  },
  loginButton: {
    backgroundColor: "#006d3c",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userGuideLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  userGuideLinkText: {
    color: "#006d3c",
    fontSize: 14,
  },

  // Forgot Password Modal Styles
  forgotPasswordContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    width: "90%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  forgotPasswordTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  forgotPasswordInstructions: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 25,
  },
  forgotPasswordInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
    marginBottom: 25,
    backgroundColor: "#fff",
  },
  forgotPasswordButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  forgotCancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    minWidth: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  forgotCancelButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  forgotSendButton: {
    backgroundColor: "#006d3c",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    minWidth: 180,
    alignItems: "center",
  },
  forgotSendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Terms Modal Styles
  modalContainer: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 15,
    maxHeight: "85%",
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  termsContent: {
    padding: 20,
    maxHeight: 300,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
    textAlign: "justify",
  },
  termsCheckboxSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  termsCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  termsCheckboxText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    justifyContent: "space-between",
  },
  closeModalButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoginScreen;