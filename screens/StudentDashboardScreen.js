import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.1.3:5003/api";

const StudentDashboardScreen = ({ route, navigation }) => {
  const { email: propEmail, studentId: propStudentId } = route.params || {};
  const studentId = propStudentId || "";
  const email = propEmail?.toLowerCase() || "";

  const [student, setStudent] = useState(null);
  const [schedule, setSchedule] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [examDate, setExamDate] = useState(null);
  const [examTime, setExamTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!studentId && !email) {
      setMessage("Missing student ID or email.");
      return;
    }

    const fetchStudent = async () => {
      setLoading(true);
      setMessage("");

      try {
        let url = `${API_BASE_URL}/student`;
        if (studentId) {
          url += `/${encodeURIComponent(studentId)}`;
        } else if (email) {
          url += `?email=${encodeURIComponent(email)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setMessage(data.message || "Student not found.");
          setStudent(null);
        } else {
          setStudent(data);
          setSchedule(data.examSchedule || "");
        }
      } catch (err) {
        setMessage("Network error.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId, email]);

  const handleScheduleSubmit = async () => {
    if (!examDate || !examTime) {
      Alert.alert("Validation", "Please select both date and time.");
      return;
    }

    const formattedDate = examDate.toISOString().split("T")[0];
    const examSchedule = `${formattedDate} ${examTime}`;
    setMessage("Saving schedule...");

    try {
      const body = studentId
        ? { studentId, examSchedule }
        : { email, examSchedule };

      const res = await fetch(`${API_BASE_URL}/student/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("✅ Exam schedule saved!");
        setSchedule(examSchedule);
        setStudent((prev) => ({ ...prev, examSchedule }));
      } else {
        setMessage(data.message || "❌ Failed to save schedule.");
      }
    } catch (err) {
      setMessage("Error saving schedule.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace("LoginScreen");
  };

  const handleProceed = () => {
    navigation.navigate("UpdateProfileScreen", {
      studentId,
      email,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading student data...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{message || "Student not found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Welcome, {student.firstName} 👋</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.status}>Status: {student.status}</Text>

      {/* Schedule Section */}
      {schedule ? (
        <View style={styles.card}>
          <Text style={styles.label}>Your Exam Schedule:</Text>
          <Text style={styles.value}>{schedule}</Text>

          {student.examStatus === "approved" && student.clearance === "cleared" ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleProceed}>
              <Text style={styles.btnText}>Proceed to Update Profile</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.info}>
              {student.examStatus !== "approved"
                ? "Exam not yet approved by guidance."
                : "You are not yet cleared for the exam."}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Choose Exam Date:</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.btnText}>Pick Date</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={examDate || new Date()}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setExamDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Choose Time:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={examTime}
              onValueChange={(val) => setExamTime(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select time" value="" />
              <Picker.Item label="09:00 AM" value="09:00 AM" />
              <Picker.Item label="01:00 PM" value="01:00 PM" />
            </Picker>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleScheduleSubmit}>
            <Text style={styles.btnText}>Save Schedule</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Message */}
      {message ? (
        <Text
          style={[
            styles.message,
            message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
              ? styles.error
              : styles.success,
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  logoutBtn: {
    backgroundColor: "#ff4d4f",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    color: "#444",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    fontSize: 14,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  info: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  picker: {
    height: 45,
    width: "100%",
  },
  primaryBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtn: {
    backgroundColor: "#6c757d",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
  message: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 15,
  },
  success: {
    color: "green",
  },
  error: {
    color: "red",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default StudentDashboardScreen;
