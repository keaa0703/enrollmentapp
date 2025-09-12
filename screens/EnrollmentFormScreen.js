import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Button, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import axios from "axios";

const ENROLL_STEPS = [
  "Personal Information",
  "Educational Information",
  "Family Information",
  "Course Lineup",
  "Payment Assessment",
  "Finalization of Enrollment"
];

const EnrollmentFormScreen = () => {
  const [step, setStep] = useState(0);
  const [sameAddress, setSameAddress] = useState(false);
  const [adminCourseLineup, setAdminCourseLineup] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [enrollForm, setEnrollForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
    presentHouseNo: "",
    presentStreet: "",
    presentBarangay: "",
    presentCity: "",
    presentProvince: "",
    presentZip: "",
    permanentHouseNo: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentCity: "",
    permanentProvince: "",
    permanentZip: "",
    elemSchool: "",
    elemYearGrad: "",
    elemAddress: "",
    jhsSchool: "",
    jhsYearGrad: "",
    jhsAddress: "",
    shsSchool: "",
    shsYearGrad: "",
    shsAddress: "",
    shsStrand: "",
    fatherName: "",
    motherName: "",
    guardianName: "",
    familyRelationship: "",
    familyOccupation: "",
    familyAddress: "",
    familyMobile: "",
  });

  useEffect(() => {
    const fetchAdminCourses = async () => {
      try {
        const res = await fetch("http://localhost:5003/api/course-lineup");
        const data = await res.json();
        setAdminCourseLineup(data.courses || []);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch course lineup");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchAdminCourses();
  }, []);

  const handleChange = (name, value) => {
    setEnrollForm((prev) => ({
      ...prev,
      [name]: value,
      ...(sameAddress && name.startsWith("present") && {
        ["permanent" + name.slice(7)]: value
      })
    }));
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const id = "mocked-student-id"; // Replace with AsyncStorage or real logic
      const res = await axios.post("http://localhost:5003/api/student/enroll", {
        id,
        enrollmentData: enrollForm,
      });
      if (res.data.success) {
        Alert.alert("Success", "Enrollment submitted successfully.");
      } else {
        Alert.alert("Error", res.data.message || "Enrollment failed.");
      }
    } catch (err) {
      Alert.alert("Error", "Server error. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} value={enrollForm.firstName} onChangeText={(val) => handleChange("firstName", val)} />
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={enrollForm.lastName} onChangeText={(val) => handleChange("lastName", val)} />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} keyboardType="email-address" value={enrollForm.email} onChangeText={(val) => handleChange("email", val)} />
            <Text style={styles.label}>Contact</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" value={enrollForm.contact} onChangeText={(val) => handleChange("contact", val)} />
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.label}>Elementary School</Text>
            <TextInput style={styles.input} value={enrollForm.elemSchool} onChangeText={(val) => handleChange("elemSchool", val)} />
            <Text style={styles.label}>Year Graduated</Text>
            <TextInput style={styles.input} value={enrollForm.elemYearGrad} onChangeText={(val) => handleChange("elemYearGrad", val)} />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.label}>Father's Name</Text>
            <TextInput style={styles.input} value={enrollForm.fatherName} onChangeText={(val) => handleChange("fatherName", val)} />
            <Text style={styles.label}>Mother's Name</Text>
            <TextInput style={styles.input} value={enrollForm.motherName} onChangeText={(val) => handleChange("motherName", val)} />
          </>
        );
      case 3:
        return (
          <View>
            <Text style={styles.label}>Course Lineup</Text>
            {loadingCourses ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              adminCourseLineup.map((course, i) => (
                <Text key={i} style={styles.courseItem}>{course.code} - {course.name}</Text>
              ))
            )}
          </View>
        );
      case 4:
        return (
          <Text style={styles.note}>Payment assessment will be handled by admin.</Text>
        );
      case 5:
        return (
          <Text style={styles.note}>Review and submit your application.</Text>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Enrollment Form</Text>
      <Text style={styles.stepTitle}>{ENROLL_STEPS[step]}</Text>
      {renderStep()}

      <View style={styles.buttonRow}>
        {step > 0 && (
          <Button title="Back" onPress={() => setStep(step - 1)} />
        )}
        {step < ENROLL_STEPS.length - 1 && (
          <Button title="Next" onPress={() => setStep(step + 1)} />
        )}
        {step === ENROLL_STEPS.length - 1 && (
          submitLoading ? (
            <ActivityIndicator size="small" color="#007bff" />
          ) : (
            <Button title="Submit Enrollment" onPress={handleSubmit} color="#007bff" />
          )
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#fff'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  label: {
    marginTop: 12,
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    marginTop: 4
  },
  courseItem: {
    paddingVertical: 4,
    fontSize: 14
  },
  note: {
    fontStyle: 'italic',
    color: '#666',
    padding: 8
  },
  buttonRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

export default EnrollmentFormScreen;
