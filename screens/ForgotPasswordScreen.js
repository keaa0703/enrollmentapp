import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your ID number or email address.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      console.log("📧 Sending reset email to:", normalizedEmail);

      await sendPasswordResetEmail(auth, normalizedEmail);

      Alert.alert(
        "Password reset email sent. Check your inbox (or spam)..",
        [
          {
            text: "OK",
            onPress: () => {
              setShowModal(false);
              navigation.goBack();
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
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    navigation.goBack();
  };

  return (
    <Modal
      visible={showModal}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Title */}
          <Text style={styles.title}>Reset password</Text>

          {/* Instructions */}
          <Text style={styles.instructions}>
            Enter your ID number or registered email to receive a verification code.
          </Text>

          {/* Input Field */}
          <TextInput
            style={styles.input}
            placeholder="ID Number or Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#999"
          />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, loading && { opacity: 0.8 }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>SEND RESET EMAIL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  instructions: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 25,
  },
  input: {
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    minWidth: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: "#006d3c",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    minWidth: 180,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;