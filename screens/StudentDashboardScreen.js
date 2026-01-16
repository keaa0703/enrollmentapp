import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  TextInput,
  Alert
} from "react-native";
import { db, storage } from "../firebase/config";
import { collection, query, where, getDocs, updateDoc, onSnapshot, doc, getDoc } from "firebase/firestore";
import { ref as storageRef, getDownloadURL } from "firebase/storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from "react-native-dropdown-picker";
import * as FileSystem from 'expo-file-system';
import { Platform, Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';



const { width } = Dimensions.get('window');

const ENROLL_STEPS = [
  "Address Information", 
  "Educational Information",
  "Family Information",
];

const FinanceScreen = ({ profile }) => {
  const [fees, setFees] = useState([]);
  const [cashDiscount, setCashDiscount] = useState(0);
  const [cashWithDiscountDate, setCashWithDiscountDate] = useState("");
  const [cashWithoutDiscountDate, setCashWithoutDiscountDate] = useState("");
  const [installmentDates, setInstallmentDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // Compute finance completion locally to avoid referencing outer-scope variables
  const isFinanceCompleted = Boolean(
    profile?.paymentStatus === "paid" ||
    profile?.finances?.paid === true ||
    profile?.registrationStatus === "paid" ||
    profile?.financials?.paid === true
  );

  useEffect(() => {
    if (profile) {
      console.log("=== PROFILE CERTIFICATE DEBUG ===");
      console.log("Student ID:", profile.idNumber);
      console.log("Certificate URL:", profile.certificateUrl || "NOT SET");
      console.log("Certificate Path:", profile.certificatePath || "NOT SET");
      console.log("Payment Status:", profile.paymentStatus);
      console.log("Finance Status:", profile.finances);
      console.log("Registration Status:", profile.registrationStatus);
      console.log("Is Finance Completed:", isFinanceCompleted);
      console.log("================================");
    }
  }, [profile, isFinanceCompleted]);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const feesRef = doc(db, "systemSettings", "miscellaneousFees");
        const feesSnap = await getDoc(feesRef);
        
        if (feesSnap.exists()) {
          const feesData = feesSnap.data();
          setFees(feesData.fees || []);
          setCashDiscount(feesData.cashDiscount || 0);
          setCashWithDiscountDate(feesData.cashWithDiscountDate || "");
          setCashWithoutDiscountDate(feesData.cashWithoutDiscountDate || "");
          setInstallmentDates(feesData.installmentDates || []);
        } else {
          setError("Fee information not available.");
        }
      } catch (err) {
        console.error("Error fetching fees:", err);
        setError("Failed to load fee information.");
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#006d3c" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>
          Loading finance details...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={{ color: '#dc3545', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  const units = profile?.totalUnits || 0;
  let total = 0;

  const feeRows = fees.map((fee, idx) => {
    let amount = 0;
    let formula = "";
    
    if (fee.formula && fee.formula.toLowerCase().includes("units") && typeof fee.amount === "number") {
      amount = units * fee.amount;
      formula = `(${units} units X ${fee.amount})`;
    } else if (fee.perUnit !== undefined) {
      amount = units * fee.perUnit;
      formula = `(${units} units X ${fee.perUnit})`;
    } else if (fee.formula) {
      formula = fee.formula;
      amount = fee.amount || 0;
    } else {
      amount = fee.amount || 0;
    }
    
    total += amount;
    return { ...fee, amount, formula };
  });

  const totalWithDiscount = total - cashDiscount;
  const installment = parseFloat((total / 5).toFixed(2));

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <ScrollView style={styles.financeContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.financeMainCard}>
        <View style={styles.leftSection}>
          <Text style={styles.sectionTitle}>MISCELLANEOUS FEES</Text>
          
          <View style={styles.feesListContainer}>
            {feeRows.map((fee, idx) => (
              <View key={idx} style={styles.feeRow}>
                <View style={styles.feeNameColumn}>
                  <Text style={styles.feeName}>{fee.label}</Text>
                  {fee.formula && <Text style={styles.feeFormula}>{fee.formula}</Text>}
                </View>
                <Text style={styles.feeAmount}>
                  {fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>OPTION 1: CASH PAYMENT WITH DISCOUNT</Text>
              <Text style={styles.optionSubtext}>
                If full payment is made on or before {formatDate(cashWithDiscountDate)}.
              </Text>
            </View>
            <Text style={styles.optionAmount}>
              {totalWithDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>OPTION 2: CASH PAYMENT WITHOUT DISCOUNT</Text>
              <Text style={styles.optionSubtext}>
                If full payment is made after {formatDate(cashWithDiscountDate)}.
              </Text>
            </View>
            <Text style={styles.optionAmount}>
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.installmentSection}>
            <Text style={styles.optionTitle}>OPTION 3: INSTALLMENT PAYMENT</Text>
            
            <View style={styles.installmentHeader}>
              <Text style={styles.installmentHeaderText}></Text>
              <Text style={[styles.installmentHeaderText, { textAlign: 'right' }]}></Text>
            </View>

            {["Downpayment", "1st Installment", "2nd Installment", "3rd Installment", "4th Installment"].map((label, idx) => (
              <View key={idx} style={styles.installmentRow}>
                <Text style={styles.installmentLabel}>{label}</Text>
                <Text style={styles.installmentDate}>
                  {installmentDates[idx] ? formatDate(installmentDates[idx]) : "TBA"}
                </Text>
                <Text style={styles.installmentAmount}>
                  {installment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            ))}

            <View style={styles.installmentTotalRow}>
              <Text style={styles.installmentTotalLabel}>Total:</Text>
              <Text style={styles.optionAmount}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>NOTE</Text>
            <Text style={styles.noteText}>
              Please check your Miscellaneous Fees breakdown carefully before proceeding.{'\n'}
              Once verified, you may proceed to the campus Finances Office to settle your payment.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const StudentDashboard = ({ route, navigation }) => {
  const { studentId } = route.params;
  const [profile, setProfile] = useState(null);
  const [studentDocRef, setStudentDocRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeScreen, setActiveScreen] = useState('home');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [appointmentStatus, setAppointmentStatus] = useState(null);
  const [entryLevelOpen, setEntryLevelOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [civilStatusOpen, setCivilStatusOpen] = useState(false);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [courseLineupCompleted, setCourseLineupCompleted] = useState(false);
  const [preRegCompleted, setPreRegCompleted] = useState(false);
  const [preRegStep, setPreRegStep] = useState(0);
  const [sameAddress, setSameAddress] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    entryLevel: "",
    semester: "",
    nationality: "",
    religion: "",
    civilStatus: "",
    birthPlace: "",
    present: {
      house: "",
      barangay: "",
      city: "",
      province: "",
      postal: "",
      country: "",
    },
    permanent: {
      house: "",
      barangay: "",
      city: "",
      province: "",
      postal: "",
      country: "",
    },
    sameAsPresent: false,
    elementary: {
      school: "",
      address: "",
      year: ""
    },
    junior: {
      school: "",
      address: "",
      year: ""
    },
    senior: {
      school: "",
      address: "",
      year: "",
      strand: ""
    },
    parentName: "",
    relationship: "",
    occupation: "",
    familyMobile: "",
    familyAddress: "",
    familySameAsPresent: false
  });

  const financeCompleted = (profile) =>
    Boolean(
      profile?.paymentStatus === "paid" ||
      profile?.finances?.paid === true ||
      profile?.registrationStatus === "paid" ||
      profile?.financials?.paid === true
    );

  const isFinanceCompleted = financeCompleted(profile);

  useEffect(() => {
    const fetchPreRegistration = async () => {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.preRegistration) {
          setEnrollForm({
            ...enrollForm,
            ...data.preRegistration,
          });
          setSameAddress(data.preRegistration.familySameAsPresent || false);
        }
      }
    };
    fetchPreRegistration();
  }, [studentId]);

  useEffect(() => {
    let unsubscribe = null;

    const fetchProfile = async () => {
      if (!studentId) {
        setError("Student ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const q = query(
  collection(db, "students"),
  where("studentId", "==", studentId)  // Changed from idNumber to studentId
);
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Student profile not found.");
          setLoading(false);
        } else {
          const studentDoc = querySnapshot.docs[0];
          const data = studentDoc.data();
          setProfile(data);
          setStudentDocRef(studentDoc.ref);

          if (data.schedules && Array.isArray(data.schedules)) {
            const calculatedTotalUnits = Object.values(
              data.schedules.reduce((acc, course) => {
                const key = [course.courseId, course.courseName, course.section].join('|');
                if (!acc[key]) acc[key] = { units: parseFloat(course.units) || 0 };
                return acc;
              }, {})
            ).reduce((sum, row) => sum + row.units, 0);
            
            if (data.totalUnits !== calculatedTotalUnits) {
              updateDoc(studentDoc.ref, { totalUnits: calculatedTotalUnits });
            }
          }

          if (data) {
            setEnrollForm(prev => ({
              ...prev,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || "",
              contact: data.contact || "",
            }));
          }

          unsubscribe = onSnapshot(studentDoc.ref, (doc) => {
            if (doc.exists()) {
              const updatedData = doc.data();
              
              if (updatedData.schedules && Array.isArray(updatedData.schedules)) {
                const calculatedTotalUnits = Object.values(
                  updatedData.schedules.reduce((acc, course) => {
                    const key = [course.courseId, course.courseName, course.section].join('|');
                    if (!acc[key]) acc[key] = { units: parseFloat(course.units) || 0 };
                    return acc;
                  }, {})
                ).reduce((sum, row) => sum + row.units, 0);
                
                if (updatedData.totalUnits !== calculatedTotalUnits) {
                  updateDoc(doc.ref, { totalUnits: calculatedTotalUnits });
                }
              }
              
              if (updatedData.appointment) {
                setAppointmentStatus(updatedData.appointment.status);
                
                if (updatedData.appointment.date && updatedData.appointment.time) {
                  const formattedTime = updatedData.appointment.time === 'am' 
                    ? 'AM 9:00-12:00' 
                    : 'PM 1:30-4:30';
                  
                  setBookingDetails({
                    date: new Date(updatedData.appointment.date).toLocaleDateString(),
                    time: formattedTime,
                    place: "Guidance Services Office Manila Adventist College",
                    address: "1975 San Juan, Pasay City, 1300 Kalakhang Manila"
                  });
                  
                  setIsBooked(updatedData.appointment.status === 'approved');
                }
              } else {
                setAppointmentStatus(null);
                setIsBooked(false);
                setBookingDetails(null);
              }
              
              if (updatedData.preRegistrationStatus === 'submitted') {
                setPreRegCompleted(true);
              }

              if (updatedData.registrationStatus === 'submitted') {
                setCourseLineupCompleted(true);
              }
            }
          });

          setLoading(false);
        }
      } catch (err) {
        console.error("Firestore error:", err);
        setError("Failed to load profile. Check your network.");
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [studentId]);

  const getCurrentAnnouncement = () => {
    if (isFinanceCompleted) {
      return {
        title: "Enrollment Complete! Download your Certificate of Registration",
        buttonText: "VIEW CERTIFICATE",
        buttonAction: () => setActiveScreen("finalenrollment"),
        buttonColor: "#28a745",
      };
    }

    if (!isBooked) {
      return {
        title: "Assessment is now open for AY 2025-2026 - First Semester",
        buttonText: "PROCEED TO ASSESSMENT",
        buttonAction: () => setActiveScreen('assessment'),
        buttonColor: "#ff9900"
      };
    }
    
    if (isBooked && !preRegCompleted) {
      return {
        title: "Complete your Pre-Registration to continue enrollment",
        buttonText: "PROCEED TO PRE-REGISTRATION",
        buttonAction: () => setActiveScreen('preregistration'),
        buttonColor: "#007bff"
      };
    }
    
    if (preRegCompleted && !courseLineupCompleted) {
      return {
        title: "Pre-Registration completed! Please wait for your Course Line-up",
        buttonText: "VIEW COURSE LINE-UP",
        buttonAction: () => setActiveScreen('courses'),
        buttonColor: "#28a745"
      };
    }

    if (courseLineupCompleted && !isFinanceCompleted) {
      return {  
        title: "Your Course Line-up is submitted! Proceed to Finances",
        buttonText: "VIEW FINANCES",
        buttonAction: () => setActiveScreen('finances'),
        buttonColor: "#17a2b8"
      };
    }
    
    return {
      title: "Welcome to your enrollment dashboard",
      buttonText: "VIEW DASHBOARD",
      buttonAction: () => {},
      buttonColor: "#6c757d"
    };
  };

  const handleFormChange = (key, value) => {
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      setEnrollForm((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setEnrollForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handlePreRegSubmit = async () => {
    setSubmitLoading(true);
    setValidationError('');

    try {
      if (!enrollForm.entryLevel || !enrollForm.semester) {
        Alert.alert("Validation Error", "Please select Entry Level and Semester.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.present?.city || !enrollForm.present?.province) {
        Alert.alert("Validation Error", "Please provide at least City and Province in Present Address.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.elementary?.school || !enrollForm.elementary?.year) {
        Alert.alert("Validation Error", "Please complete Elementary School information.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.junior?.school || !enrollForm.junior?.year) {
        Alert.alert("Validation Error", "Please complete Junior High School information.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.senior?.school || !enrollForm.senior?.year || !enrollForm.senior?.strand) {
        Alert.alert("Validation Error", "Please complete Senior High School information including Strand.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.parentName?.trim() || !enrollForm.relationship || 
          !enrollForm.occupation?.trim() || !enrollForm.familyMobile?.trim()) {
        Alert.alert("Validation Error", "Please complete all required family information fields.");
        setSubmitLoading(false);
        return;
      }

      if (!enrollForm.familyAddress?.trim()) {
        Alert.alert("Validation Error", "Please provide family address.");
        setSubmitLoading(false);
        return;
      }

      await updateDoc(studentDocRef, {
        preRegistration: enrollForm,
        preRegistrationStatus: 'submitted',
        preRegistrationSubmittedAt: new Date().toISOString(),
      });

      Alert.alert(
        "Success", 
        "Pre-registration submitted successfully!",
        [{
          text: "OK",
          onPress: () => {
            setPreRegCompleted(true);
            setActiveScreen('home');
          }
        }]
      );
    } catch (err) {
      console.error("Firebase error:", err);
      Alert.alert("Error", "Failed to submit pre-registration. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderPreRegStep = () => {
    switch (preRegStep) {
      case 0:
        return (
          <>
            <Text style={styles.formLabel}>Entry Level</Text>
            <View style={{ zIndex: 1000 }}>
              <DropDownPicker
                open={entryLevelOpen}
                value={enrollForm.entryLevel}
                items={[
                  { label: "First Year", value: "First Year" },
                  { label: "Second Year", value: "Second Year" },
                  { label: "Third Year", value: "Third Year" },
                  { label: "Fourth Year", value: "Fourth Year" },
                  { label: "Fifth Year", value: "Fifth Year" },
                ]}
                setOpen={(open) => {
                  setEntryLevelOpen(open);
                  if (open) {
                    setSemesterOpen(false);
                    setCivilStatusOpen(false);
                  }
                }}
                setValue={(callback) => {
                  const newValue = typeof callback === 'function'
                    ? callback(enrollForm.entryLevel)
                    : callback;
                  handleFormChange("entryLevel", newValue);
                }}
                placeholder="Select Entry Level..."
                listMode="SCROLLVIEW"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            <Text style={styles.formLabel}>Semester</Text>
            <View style={{ zIndex: 900 }}>
              <DropDownPicker
                open={semesterOpen}
                value={enrollForm.semester}
                items={[
                  { label: "First Semester", value: "First Semester" },
                  { label: "Second Semester", value: "Second Semester" },
                ]}
                setOpen={(open) => {
                  setSemesterOpen(open);
                  if (open) {
                    setEntryLevelOpen(false);
                    setCivilStatusOpen(false);
                  }
                }}
                setValue={(callback) => {
                  const newValue = typeof callback === 'function'
                    ? callback(enrollForm.semester)
                    : callback;
                  handleFormChange("semester", newValue);
                }}
                placeholder="Select Semester..."
                listMode="SCROLLVIEW"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            <Text style={styles.formLabel}>Nationality</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.nationality}
              onChangeText={(val) => handleFormChange("nationality", val)}
              placeholder="Enter Nationality"
            />

            <Text style={styles.formLabel}>Religion</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.religion}
              onChangeText={(val) => handleFormChange("religion", val)}
              placeholder="Enter Religion"
            />

            <Text style={styles.formLabel}>Civil Status</Text>
            <View style={{ zIndex: 600 }}>
              <DropDownPicker
                open={civilStatusOpen}
                value={enrollForm.civilStatus}
                items={[
                  { label: "Single", value: "Single" },
                  { label: "Married", value: "Married" },
                  { label: "Widowed", value: "Widowed" },
                  { label: "Separated", value: "Separated" },
                ]}
                setOpen={setCivilStatusOpen}
                setValue={(callback) => {
                  const newValue = typeof callback === 'function'
                    ? callback(enrollForm.civilStatus)
                    : callback;
                  handleFormChange("civilStatus", newValue);
                }}
                onOpen={() => {
                  setEntryLevelOpen(false);
                  setSemesterOpen(false);
                }}
                placeholder="Select Civil Status..."
                listMode="SCROLLVIEW"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />
            </View>

            <Text style={styles.formLabel}>Birth Place</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.birthPlace}
              onChangeText={(val) => handleFormChange("birthPlace", val)}
              placeholder="Enter Birth Place"
            />

            <Text style={styles.sectionHeader}>Present Address</Text>
            <Text style={styles.formLabel}>House No./Unit/Floor</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.present?.house || ""}
              onChangeText={(val) => handleFormChange("present.house", val)}
            />
            <Text style={styles.formLabel}>Barangay</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.present?.barangay || ""}
              onChangeText={(val) => handleFormChange("present.barangay", val)}
            />
            <Text style={styles.formLabel}>City</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.present?.city || ""}
              onChangeText={(val) => handleFormChange("present.city", val)}
              placeholder="Enter City (Required)"
            />
            <Text style={styles.formLabel}>Province</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.present?.province || ""}
              onChangeText={(val) => handleFormChange("present.province", val)}
              placeholder="Enter Province (Required)"
            />
            <Text style={styles.formLabel}>Postal Code</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={enrollForm.present?.postal || ""}
              onChangeText={(val) => handleFormChange("present.postal", val)}
            />
            <Text style={styles.formLabel}>Country</Text>
            <TextInput
              style={styles.formInput}
              value={enrollForm.present?.country || ""}
              onChangeText={(val) => handleFormChange("present.country", val)}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                const newSameAddress = !sameAddress;
                setSameAddress(newSameAddress);

                if (newSameAddress) {
                  setEnrollForm(prev => ({
                    ...prev,
                    permanent: { ...prev.present },
                  }));
                } else {
                  setEnrollForm(prev => ({
                    ...prev,
                    permanent: { house: "", barangay: "", city: "", province: "", postal: "", country: "" },
                  }));
                }
              }}
            >
              <View style={[styles.checkbox, sameAddress && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Same as present address</Text>
            </TouchableOpacity>

            {!sameAddress && (
              <>
                <Text style={styles.sectionHeader}>Permanent Address</Text>
                <Text style={styles.formLabel}>House No./Unit/Floor</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.permanent?.house || ""}
                  onChangeText={(val) => handleFormChange("permanent.house", val)}
                />
                <Text style={styles.formLabel}>Barangay</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.permanent?.barangay || ""}
                  onChangeText={(val) => handleFormChange("permanent.barangay", val)}
                />
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.permanent?.city || ""}
                  onChangeText={(val) => handleFormChange("permanent.city", val)}
                />
                <Text style={styles.formLabel}>Province</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.permanent?.province || ""}
                  onChangeText={(val) => handleFormChange("permanent.province", val)}
                />
                <Text style={styles.formLabel}>Postal Code</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={enrollForm.permanent?.postal || ""}
                  onChangeText={(val) => handleFormChange("permanent.postal", val)}
                />
                <Text style={styles.formLabel}>Country</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.permanent?.country || ""}
                  onChangeText={(val) => handleFormChange("permanent.country", val)}
                />
              </>
            )}
          </>
        );

      case 1:
        return (
          <>
            <Text style={styles.sectionHeader}>Elementary School</Text>
            <Text style={styles.formLabel}>School Name</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.elementary?.school || ""} 
              onChangeText={(val) => handleFormChange("elementary.school", val)} 
            />
            <Text style={styles.formLabel}>Year Graduated</Text>
            <TextInput 
              style={styles.formInput} 
              keyboardType="numeric"
              value={enrollForm.elementary?.year || ""} 
              onChangeText={(val) => handleFormChange("elementary.year", val)} 
            />
            <Text style={styles.formLabel}>School Address</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.elementary?.address || ""} 
              onChangeText={(val) => handleFormChange("elementary.address", val)} 
            />

            <Text style={styles.sectionHeader}>Junior High School</Text>
            <Text style={styles.formLabel}>School Name</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.junior?.school || ""} 
              onChangeText={(val) => handleFormChange("junior.school", val)} 
            />
            <Text style={styles.formLabel}>Year Graduated</Text>
            <TextInput 
              style={styles.formInput} 
              keyboardType="numeric"
              value={enrollForm.junior?.year || ""} 
              onChangeText={(val) => handleFormChange("junior.year", val)} 
            />
            <Text style={styles.formLabel}>School Address</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.junior?.address || ""} 
              onChangeText={(val) => handleFormChange("junior.address", val)} 
            />

            <Text style={styles.sectionHeader}>Senior High School</Text>
            <Text style={styles.formLabel}>School Name</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.senior?.school || ""} 
              onChangeText={(val) => handleFormChange("senior.school", val)} 
            />
            <Text style={styles.formLabel}>Year Graduated</Text>
            <TextInput 
              style={styles.formInput} 
              keyboardType="numeric"
              value={enrollForm.senior?.year || ""} 
              onChangeText={(val) => handleFormChange("senior.year", val)} 
            />
            <Text style={styles.formLabel}>School Address</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.senior?.address || ""} 
              onChangeText={(val) => handleFormChange("senior.address", val)} 
            />
            <Text style={styles.formLabel}>Strand/Track</Text>
            <TextInput 
              style={styles.formInput} 
              value={enrollForm.senior?.strand || ""} 
              onChangeText={(val) => handleFormChange("senior.strand", val)} 
            />
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.sectionHeader}>Family Information</Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Name of Parent *</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.parentName || ""}
                  onChangeText={(val) => handleFormChange("parentName", val)}
                  placeholder="Enter parent name"
                />
              </View>

              <View style={[styles.halfInput, { zIndex: 1000 }]}>
                <Text style={styles.formLabel}>Relationship *</Text>
                <DropDownPicker
                  open={relationshipOpen}
                  value={enrollForm.relationship || ""}
                  items={[
                    { label: "Father", value: "Father" },
                    { label: "Mother", value: "Mother" },
                    { label: "Guardian", value: "Guardian" },
                  ]}
                  setOpen={setRelationshipOpen}
                  setValue={(callback) => {
                    const newValue = typeof callback === 'function' 
                      ? callback(enrollForm.relationship) 
                      : callback;
                    handleFormChange("relationship", newValue);
                  }}
                  placeholder="Select Relationship"
                  listMode="SCROLLVIEW"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Occupation *</Text>
                <TextInput
                  style={styles.formInput}
                  value={enrollForm.occupation || ""}
                  onChangeText={(val) => handleFormChange("occupation", val)}
                  placeholder="Enter occupation"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Mobile No. *</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="phone-pad"
                  value={enrollForm.familyMobile || ""}
                  onChangeText={(val) => handleFormChange("familyMobile", val)}
                  placeholder="Enter mobile number"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Address *</Text>
            <TextInput
              style={[
                styles.formInput, 
                enrollForm.familySameAsPresent && styles.disabledInput
              ]}
              value={enrollForm.familyAddress || ""}
              onChangeText={(val) => {
                if (!enrollForm.familySameAsPresent) {
                  handleFormChange("familyAddress", val);
                }
              }}
              placeholder="Enter address"
              editable={!enrollForm.familySameAsPresent}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                const newSameAsPresent = !enrollForm.familySameAsPresent;
                handleFormChange("familySameAsPresent", newSameAsPresent);
                
                if (newSameAsPresent) {
                  const presentAddress = `${enrollForm.present?.house || ''} ${enrollForm.present?.barangay || ''}, ${enrollForm.present?.city || ''}, ${enrollForm.present?.province || ''} ${enrollForm.present?.postal || ''}`.trim();
                  handleFormChange("familyAddress", presentAddress);
                } else {
                  handleFormChange("familyAddress", "");
                }
              }}
            >
              <View style={[styles.checkbox, enrollForm.familySameAsPresent && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Same as Present Address</Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  const menuItems = [
    { 
      name: "Home", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('home');
      },
      active: activeScreen === 'home'
    },
    { 
      name: "Assessment", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('assessment');
      },
      active: activeScreen === 'assessment'
    },
    { 
      name: "Pre-Registration", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('preregistration');
      },
      active: activeScreen === 'preregistration'
    },
    { 
      name: "Course Line-up", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('courses');
      },
      active: activeScreen === 'courses'
    },
    { 
      name: "Finances", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('finances');
      },
      active: activeScreen === 'finances'
    },
    { 
      name: "Final Enrollment", 
      onPress: () => {
        setShowMenu(false);
        setActiveScreen('finalenrollment');
      },
      active: activeScreen === 'finalenrollment'
    },
  ];

  const renderMainContent = () => {
    switch(activeScreen) {
      case 'assessment':
        return (
          <View style={styles.assessmentCard}>
          
            <Text style={styles.assessmentTitle}>Competency Assessment</Text>
            
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <View style={styles.instructionTextContainer}>
                  {appointmentStatus === null || appointmentStatus === "disapproved" ? (
                    <>
                      <Text style={styles.instructionText}>
                        Choose your preferred schedule{' '}
                      </Text>
                      <TouchableOpacity 
                        style={styles.hereButton}
                        onPress={() => {
                          setValidationError('');
                          setSelectedTime(''); 
                          setSelectedDate(new Date());
                          setShowBookingModal(true);
                        }}
                      >
                        <Text style={styles.hereButtonText}>here</Text>
                      </TouchableOpacity>
                    </>
                  ) : appointmentStatus === "pending" ? (
                    <Text style={styles.instructionText}>
                      Your appointment is pending approval from the admin.
                    </Text>
                  ) : (
                    <Text style={styles.instructionText}>
                      You have already booked your schedule.
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>
                  On your approved schedule, proceed first to the{' '}
                  <Text style={styles.boldText}>Finances</Text>, onsite payment only (Php 500).
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>
                  Show your receipt to the Guidance Services Office for the Competency Assessment.
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>
                  Once you're done with the assessment, you can continue your enrollment.
                </Text>
              </View>
            </View>

            {isBooked && bookingDetails && (
              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleCardTitle}>Competency Assessment Schedule</Text>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleLabel}>Date: </Text>
                  <Text style={styles.scheduleValue}>{bookingDetails.date}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleLabel}>Time: </Text>
                  <Text style={styles.scheduleValue}>{bookingDetails.time}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleLabel}>Place: </Text>
                  <Text style={styles.scheduleValue}>{bookingDetails.place}</Text>
                </View>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleLabel}>Address: </Text>
                  <Text style={styles.scheduleValue}>{bookingDetails.address}</Text>
                </View>
              </View>
            )}

            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>
                For inquiry about the Competency Assessment, contact the Guidance Services Office.
              </Text>
              <Text style={styles.contactEmail}>macpsychcenter@mac.edu.ph</Text>
              <Text style={styles.contactPhone}>Telephone: 09-8525-6101 local 281</Text>
            </View>
          </View>
        );
        
      case 'preregistration':
        return (
          <View style={styles.card}>
           
            <Text style={styles.sectionTitle}>Pre-Registration</Text>

            {!isBooked ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ You need to complete your Assessment booking first before proceeding with Pre-Registration.
                </Text>
                <TouchableOpacity 
                  style={styles.goToAssessmentButton}
                  onPress={() => setActiveScreen('assessment')}
                >
                  <Text style={styles.goToAssessmentButtonText}>Go to Assessment</Text>
                </TouchableOpacity>
              </View>
            ) : preRegCompleted ? (
              <View style={styles.completionCard}>
                <Text style={styles.completionTitle}>Profile Information Complete</Text>
                <Text style={styles.completionMessage}>
                  You have already done with Profile Information.{'\n'}
                  Please wait for your Course Line-up.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Step {preRegStep + 1} of {ENROLL_STEPS.length}: {ENROLL_STEPS[preRegStep]}
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((preRegStep + 1) / ENROLL_STEPS.length) * 100}%` }]} />
                  </View>
                </View>

                <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                  {renderPreRegStep()}
                </ScrollView>

                <View style={styles.formButtonRow}>
                  {preRegStep > 0 && (
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => setPreRegStep(preRegStep - 1)}
                    >
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  
                  {preRegStep < ENROLL_STEPS.length - 1 ? (
                    <TouchableOpacity 
                      style={styles.nextButton}
                      onPress={() => setPreRegStep(preRegStep + 1)}
                    >
                      <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.submitButton}
                      onPress={handlePreRegSubmit}
                      disabled={submitLoading}
                    >
                      {submitLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Finish</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        );
      
      case 'courses':
        const groupedCourses = profile?.schedules ? Object.values(
          profile.schedules.reduce((acc, course) => {
            const key = [course.courseId, course.courseName, course.section].join('|');
            if (!acc[key]) {
              acc[key] = {
                courseId: course.courseId,
                courseName: course.courseName,
                section: course.section,
                units: course.units,
                meetings: []
              };
            }
            acc[key].meetings.push({
              day: course.day,
              time: course.time,
              room: course.room,
              prof: course.prof
            });
            return acc;
          }, {})
        ) : [];

        const totalUnits = groupedCourses.reduce((sum, row) => 
          sum + (parseFloat(row.units) || 0), 0
        );

        const isSubmitted = profile?.registrationStatus === 'submitted';

        return (
          <View style={styles.card}>
            
            <Text style={styles.sectionTitle}>Course Line-up</Text>

            {groupedCourses.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Code</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 200 }]}>Description</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 60 }]}>Section</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Day</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 120 }]}>Time</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Room</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 150 }]}>Instructor</Text>
                    <Text style={[styles.tableHeaderCell, { minWidth: 60 }]}>Units</Text>
                  </View>

                  {groupedCourses.map((row, index) => (
                    <View key={`${row.courseId}-${row.section}-${index}`} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { minWidth: 80 }]}>{row.courseId}</Text>
                      <Text style={[styles.tableCell, { minWidth: 200 }]}>{row.courseName}</Text>
                      <Text style={[styles.tableCell, { minWidth: 60 }]}>{row.section}</Text>
                      
                      <View style={{ minWidth: 80 }}>
                        {row.meetings.map((m, i) => (
                          <Text key={i} style={styles.tableCell}>{m.day}</Text>
                        ))}
                      </View>
                      
                      <View style={{ minWidth: 120 }}>
                        {row.meetings.map((m, i) => (
                          <Text key={i} style={styles.tableCell}>{m.time}</Text>
                        ))}
                      </View>
                      
                      <View style={{ minWidth: 80 }}>
                        {row.meetings.map((m, i) => (
                          <Text key={i} style={styles.tableCell}>{m.room}</Text>
                        ))}
                      </View>
                      
                      <View style={{ minWidth: 150 }}>
                        {row.meetings.map((m, i) => (
                          <Text key={i} style={styles.tableCell}>{m.prof}</Text>
                        ))}
                      </View>
                      
                      <Text style={[styles.tableCell, { minWidth: 60 }]}>{row.units}</Text>
                    </View>
                  ))}

                  <View style={[styles.tableRow, styles.tableFooter]}>
                    <Text style={[styles.tableCell, { fontWeight: 'bold', minWidth: 720 }]}>
                      TOTAL UNITS:
                    </Text>
                    <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                      {totalUnits.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <Text style={{ color: '#888', marginTop: 20, textAlign: 'center' }}>
                No course lineup available yet.
              </Text>
            )}

            <Text style={{ marginTop: 20, fontSize: 14, color: '#555', lineHeight: 20 }}>
              Review carefully the course line-up created by your department.{"\n"}
              If you want changes in your course line-up, contact/email your department for revisions.{"\n"}
              Click the <Text style={{ fontWeight: 'bold' }}>SUBMIT</Text> button once you already finalized your course line-up.
            </Text>

            {groupedCourses.length > 0 && !isSubmitted && (
              <TouchableOpacity
                style={[styles.submitButton, { marginTop: 15 }]}
                onPress={async () => {
                  if (!studentDocRef) {
                    Alert.alert("Error", "Student profile not found.");
                    return;
                  }
                  try {
                    await updateDoc(studentDocRef, {
                      registrationStatus: "submitted",
                      registrationSubmittedAt: new Date().toISOString(),
                    });
                    Alert.alert("Success", "Your course line-up has been submitted!");
                  } catch (err) {
                    console.error("Error submitting course line-up:", err);
                    Alert.alert("Error", "Failed to submit course line-up.");
                  }
                }}
              >
                <Text style={styles.submitButtonText}>SUBMIT</Text>
              </TouchableOpacity>
            )}

            {isSubmitted && (
              <View style={{ marginTop: 15, padding: 15, backgroundColor: '#d4edda', borderRadius: 6 }}>
                <Text style={{ color: '#155724', fontSize: 14, textAlign: 'center' }}>
                  ✓ Course line-up already submitted
                </Text>
              </View>
            )}
          </View>
        );

      case 'finances':
        return (
          <View>
            
            <FinanceScreen profile={profile} />
          </View>
        );

      case 'finalenrollment':
        const finalGroupedCourses = profile?.schedules ? Object.values(
          profile.schedules.reduce((acc, course) => {
            const key = [course.courseId, course.courseName, course.section].join('|');
            if (!acc[key]) {
              acc[key] = {
                courseId: course.courseId,
                courseName: course.courseName,
                section: course.section,
                units: course.units,
                meetings: []
              };
            }
            acc[key].meetings.push({
              day: course.day,
              time: course.time,
              room: course.room,
              prof: course.prof
            });
            return acc;
          }, {})
        ) : [];

        const finalTotalUnits = finalGroupedCourses.reduce((sum, row) => 
          sum + (parseFloat(row.units) || 0), 0
        );

        return (
          <ScrollView style={styles.finalEnrollmentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.finalEnrollmentCard}>
        
              <Text style={styles.congratsTitle}>You are now officially enrolled</Text>
              <Text style={styles.congratsSubtitle}>
                Your Certificate of Registration is ready for download.
              </Text>
              
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadCertificate}
              >
                <Text style={styles.downloadButtonText}>DOWNLOAD CERTIFICATE</Text>
              </TouchableOpacity>

              <View style={styles.certificatePreview}>
                <Text style={styles.certHeader}>Manila Adventist College</Text>
                <Text style={styles.certSubheader}>CERTIFICATE OF REGISTRATION</Text>
                <Text style={styles.certAY}>
                  A.Y.: {profile?.AY || "2025-2026"} {profile?.preRegistration?.semester || "First Semester"}
                </Text>

                <View style={styles.certInfo}>
                  <Text style={styles.certInfoText}>
                    <Text style={styles.certInfoLabel}>Name: </Text>
                    {profile?.lastName}, {profile?.firstName}
                  </Text>
                  <Text style={styles.certInfoText}>
                    <Text style={styles.certInfoLabel}>Student ID: </Text>
                    {profile?.idNumber}
                  </Text>
                  <Text style={styles.certInfoText}>
                    <Text style={styles.certInfoLabel}>Program: </Text>
                    {profile?.program}
                  </Text>
                  <Text style={styles.certInfoText}>
                    <Text style={styles.certInfoLabel}>Year Level: </Text>
                    {profile?.preRegistration?.entryLevel || "N/A"}
                  </Text>
                </View>

                <Text style={styles.certSectionTitle}>Course Line-up</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.certTable}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Code</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 180 }]}>Description</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 60 }]}>Section</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Day</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 100 }]}>Time</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 80 }]}>Room</Text>
                      <Text style={[styles.tableHeaderCell, { minWidth: 60 }]}>Units</Text>
                    </View>

                    {finalGroupedCourses.length > 0 ? (
                      finalGroupedCourses.map((row, idx) => (
                        <View key={idx} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { minWidth: 80 }]}>{row.courseId}</Text>
                          <Text style={[styles.tableCell, { minWidth: 180 }]}>{row.courseName}</Text>
                          <Text style={[styles.tableCell, { minWidth: 60 }]}>{row.section}</Text>
                          <View style={{ minWidth: 80 }}>
                            {row.meetings.map((m, i) => (
                              <Text key={i} style={styles.tableCell}>{m.day}</Text>
                            ))}
                          </View>
                          <View style={{ minWidth: 100 }}>
                            {row.meetings.map((m, i) => (
                              <Text key={i} style={styles.tableCell}>{m.time}</Text>
                            ))}
                          </View>
                          <View style={{ minWidth: 80 }}>
                            {row.meetings.map((m, i) => (
                              <Text key={i} style={styles.tableCell}>{m.room}</Text>
                            ))}
                          </View>
                          <Text style={[styles.tableCell, { minWidth: 60 }]}>{row.units}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.tableRow}>
                        <Text style={{ textAlign: 'center', color: '#888', padding: 12, minWidth: 640 }}>
                          No courses found.
                        </Text>
                      </View>
                    )}

                    <View style={[styles.tableRow, styles.tableFooter]}>
                      <Text style={[styles.tableCell, { fontWeight: 'bold', minWidth: 640 }]}>
                        TOTAL UNITS:
                      </Text>
                      <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                        {finalTotalUnits.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.certNotice}>
                  <Text style={styles.certNoticeTitle}>IMPORTANT NOTICE:</Text>
                  <Text style={styles.certNoticeText}>
                    1. Students with requirement deficiency will be placed as a PROBATIONARY STUDENT.{'\n'}
                    2. This registration form serves as the student's proof of enrollment.{'\n'}
                    3. This computer-generated REGISTRATION FORM has been electronically approved.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      
      default:
        const currentAnnouncement = getCurrentAnnouncement();
        
        return (
          <>
            
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Information</Text>
              <Text style={styles.infoText}>Full Name: {profile?.firstName} {profile?.lastName}</Text>
              <Text style={styles.infoText}>ID Number: {profile?.idNumber}</Text>
              <Text style={styles.infoText}>Program: {profile?.program}</Text>
            </View>

            {isBooked && bookingDetails && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Your Assessment Schedule</Text>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleText}>Date: {bookingDetails.date}</Text>
                  <Text style={styles.scheduleText}>Time: {bookingDetails.time}</Text>
                  <Text style={styles.scheduleText}>Place: {bookingDetails.place}</Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Announcement</Text>
              </View>
              <View style={styles.announcementContent}>
                <Text style={styles.announcementText}>
                  {currentAnnouncement.title}
                </Text>
                <TouchableOpacity
                  style={[styles.assessButton, { backgroundColor: currentAnnouncement.buttonColor }]}
                  onPress={currentAnnouncement.buttonAction}
                >
                  <Text style={styles.assessButtonText}>{currentAnnouncement.buttonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        );
    }
  };

  const profileMenuItems = [
    {
      name: "Log out",
      onPress: () => {
        setShowProfileMenu(false);
        navigation.navigate("Login");
      }
    }
  ];

  const handleSubmitBooking = async () => {
    setValidationError('');
    if (!selectedTime) {
      setValidationError("Please select a time before submitting.");
      return;
    }
    
    const dateIso = selectedDate.toISOString().split('T')[0];
    
    if (!studentDocRef) return;
    setIsSubmittingBooking(true);
    
    try {
      await updateDoc(studentDocRef, {
        appointment: {
          date: dateIso,
          status: "pending",
          time: selectedTime.toLowerCase()
        }
      });
      
      setShowBookingModal(false);
      Alert.alert(
        'Appointment Submitted', 
        'Your appointment request has been submitted. Please wait for admin approval.'
      );
    } catch (err) {
      console.error('Failed to save booking:', err);
      Alert.alert('Error', 'Failed to submit appointment. Please try again.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleDownloadCertificate = async () => {
  try {
    if (!profile?.certificateUrl && !profile?.certificatePath) {
      Alert.alert(
        "Certificate Not Available",
        "Your Certificate of Registration is not yet available. Please contact the admin."
      );
      return;
    }

    let downloadUrl = profile.certificateUrl;

    // Get download URL from Firebase Storage if we only have the path
    if (!downloadUrl && profile.certificatePath) {
      try {
        const certRef = storageRef(storage, profile.certificatePath);
        downloadUrl = await getDownloadURL(certRef);
        
        // Update profile with the URL for future use
        if (studentDocRef) {
          await updateDoc(studentDocRef, {
            certificateUrl: downloadUrl
          });
        }
      } catch (error) {
        console.error("Error getting download URL:", error);
        Alert.alert("Error", "Could not retrieve certificate. Please contact support.");
        return;
      }
    }

    if (!downloadUrl) {
      Alert.alert("Error", "Certificate URL not found.");
      return;
    }

    console.log("Download URL:", downloadUrl);

    // Check if we have file system permissions
    const { status } = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
    if (!status) {
      Alert.alert("Error", "Cannot access file system.");
      return;
    }

    // Generate unique filename
    const timestamp = new Date().getTime();
    const fileName = `COR_${profile?.idNumber}_${timestamp}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    console.log("Downloading to:", fileUri);

    // Show loading state
    Alert.alert("Downloading", "Preparing your certificate...");

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      downloadUrl,
      fileUri
    );

    console.log("Download result:", downloadResult);

    if (downloadResult.status === 200) {
      // Success!
      Alert.alert(
        "Download Successful! ✓",
        `Your Certificate of Registration has been downloaded.\n\nFile: ${fileName}\n\nLocation: Documents folder`,
        [
          { 
            text: "OK",
            style: "default"
          },
          {
            text: "View File",
            onPress: async () => {
              try {
                // Try to open the file
                const canOpen = await Linking.canOpenURL(downloadResult.uri);
                if (canOpen) {
                  await Linking.openURL(downloadResult.uri);
                } else {
                  // Fallback: Open in browser
                  await Linking.openURL(downloadUrl);
                }
              } catch (err) {
                console.error("Error opening file:", err);
                // Last resort: open original URL in browser
                await Linking.openURL(downloadUrl);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(`Download failed with status: ${downloadResult.status}`);
    }

  } catch (error) {
    console.error("Certificate download error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    Alert.alert(
      "Download Failed",
      "Unable to download the certificate file. Would you like to view it online instead?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "View Online",
          onPress: async () => {
            try {
              let viewUrl = profile?.certificateUrl;
              
              if (!viewUrl && profile?.certificatePath) {
                const certRef = storageRef(storage, profile.certificatePath);
                viewUrl = await getDownloadURL(certRef);
              }
              
              if (viewUrl) {
                const supported = await Linking.canOpenURL(viewUrl);
                if (supported) {
                  await Linking.openURL(viewUrl);
                } else {
                  Alert.alert("Error", "Cannot open certificate URL.");
                }
              } else {
                Alert.alert("Error", "Certificate URL not found.");
              }
            } catch (err) {
              console.error("Error opening URL:", err);
              Alert.alert("Error", "Failed to open certificate. Please contact support.");
            }
          }
        }
      ]
    );
  }
};

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading Profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    
    <View style={styles.layout}>
      
      <View style={styles.header}>
  <Text style={styles.pageTitle}>ENROLLEASE</Text>
  
  <View style={styles.headerContent}>
    <TouchableOpacity 
      style={styles.menuButton}
      onPress={() => setShowMenu(!showMenu)}
    >
      <Text style={styles.menuIcon}>☰</Text>
    </TouchableOpacity>
    
    <View style={styles.profileSection}>
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={() => setShowProfileMenu(!showProfileMenu)}
      >
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text style={styles.profileId}>ID: {profile?.idNumber}</Text>
        </View>
        {profile?.profileImage ? (
          <Image 
            source={{ uri: profile.profileImage }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileInitials}>
              {(profile?.firstName?.charAt(0) || 'S')}{(profile?.lastName?.charAt(0) || 'T')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  </View>
</View>

      {showMenu && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.slideMenu}>
            <View style={styles.menuHeader}>
            
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Text style={styles.closeMenu}>×</Text>
              </TouchableOpacity>
            </View>
            
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, item.active && styles.activeMenuItem]}
                onPress={item.onPress}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={[styles.menuItemText, item.active && styles.activeMenuText]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {showProfileMenu && (
        <TouchableOpacity 
          style={styles.profileOverlay} 
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileDropdown}>
            {profileMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.profileMenuItem}
                onPress={item.onPress}
              >
                <Text style={[
                  styles.profileMenuText,
                  item.name === "Log out" && styles.logoutText
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {showBookingModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Book an Appointment</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.appointmentInfo}>
                <Text style={styles.infoPoint}>• Competency Assessment for 2023-2024 First Semester applicants will open starting July 17, 2023.</Text>
                <Text style={styles.infoPoint}>• Selected schedule before the opening date will be invalid.</Text>
                <Text style={styles.infoPoint}>• Please select a date between Mondays-Thursdays only, except holidays.</Text>
                <Text style={styles.infoPoint}>• For Friday, select AM schedule only.</Text>
                <Text style={styles.infoPoint}>• 30 applicants per schedule only.</Text>
              </View>

              <View style={styles.scheduleSection}>
                <Text style={styles.scheduleTitle}>Choose date Schedule</Text>
                
                <TouchableOpacity 
                  style={styles.dateInputContainer}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateInput}>
                    {selectedDate.toLocaleDateString()}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>

                {validationError ? (
                  <Text style={styles.errorText}>{validationError}</Text>
                ) : null}

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        const dayOfWeek = date.getDay();
                        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                          setSelectedDate(date);
                          setValidationError('');
                          if (dayOfWeek === 5) {
                            setSelectedTime('AM');
                          }
                        } else {
                          setValidationError('Please select a weekday (Monday-Friday only).');
                        }
                      }
                    }}
                  />
                )}

                <View style={styles.timeOptions}>
                  <TouchableOpacity 
                    style={styles.timeOption}
                    onPress={() => setSelectedTime('AM')}
                  >
                    <View style={[styles.radio, selectedTime === 'AM' && styles.radioSelected]} />
                    <View>
                      <Text style={[styles.timeText, selectedTime === 'AM' ? null : styles.disabledText]}>AM 9:00-12:00</Text>
                      <Text style={styles.slotText}>Slots remaining: —</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {selectedDate.getDay() !== 5 && (
                    <TouchableOpacity 
                      style={styles.timeOption}
                      onPress={() => setSelectedTime('PM')}
                    >
                      <View style={[styles.radio, selectedTime === 'PM' && styles.radioSelected]} />
                      <View>
                        <Text style={[styles.timeText, selectedTime === 'PM' ? null : styles.disabledText]}>PM 1:30-4:30</Text>
                        <Text style={styles.slotText}>Slots remaining: —</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={styles.closeButtonText}>CLOSE</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmitBooking}
                disabled={isSubmittingBooking}
              >
                <Text style={styles.submitButtonText}>{isSubmittingBooking ? 'Saving...' : 'SUBMIT'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderMainContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  layout: { 
    flex: 1, 
    backgroundColor: "#f4f4f4" 
  },
  header: {
  backgroundColor: "#006d3c",
  paddingHorizontal: 16,
  paddingTop: 45,
  paddingBottom: 16,
  elevation: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
  headerContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
  headerTop: {
  alignItems: "center",
  marginBottom: 18,
},
headerBottom: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
  menuButton: {
  padding: 8,
},

   menuIcon: {
  color: "#fff",
  fontSize: 24,
  fontWeight: "bold",
},
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1000,
  },
  slideMenu: {
    backgroundColor: "#fff",
    width: width * 0.75,
    height: "100%",
    paddingTop: 50,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",

  },
  dashboardpage: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0c1014ff",
    marginBottom: 8,
    alignSelf: "center",
  },
  pageTitle: {
  fontSize: 24,
  fontWeight: "800",
  color: "#ffffff",
  textAlign: "center",
  letterSpacing: 2,
  marginBottom: 5,
  marginTop: 10,
},
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeMenu: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  activeMenuItem: {
    backgroundColor: "#f0f8f5",
    borderRightWidth: 3,
    borderRightColor: "#006d3c",
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  activeMenuText: {
    color: "#006d3c",
    fontWeight: "600",
  },
  profileSection: {
    position: 'relative',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInfo: {
    marginRight: 12,
    alignItems: 'flex-end',
  },
  profileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 150,
  },
  profileId: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
 
profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInitials: {
    color: '#006d3c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  profileDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    paddingVertical: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  profileMenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  profileMenuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
    lineHeight: 20,
  },
  logoutText: {
    color: '#ff6b35',
    fontWeight: '400',
  },
  content: { 
    flex: 1, 
    padding: 20,
    paddingTop: 25
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  cardHeader: {
    marginBottom: 10,
  },
  announcementContent: {
    marginTop: 5,
  },
  
  announcementText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 15,
    lineHeight: 22,
  },
  assessButton: {
    backgroundColor: "#ff9900",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row", 
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",  
  },
  assessButtonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  assessmentCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 25,
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  assessmentTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 25,
    marginTop: 5,
  },
  instructionsList: {
    marginBottom: 30,
    marginTop: 10,
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start",
    paddingLeft: 5,
  },
  bulletPoint: {
    fontSize: 16,
    color: "#333",
    marginRight: 10,
    marginTop: 1,
  },
  instructionText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
    flex: 1,
  },
  hereButton: {
    backgroundColor: "#ff9900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  hereButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  scheduleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 25,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 70,
  },
  scheduleValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: "600",
    color: "#333",
  },
  contactInfo: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 25,
    marginTop: 10,
  },
  contactTitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  contactEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  contactPhone: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    margin: 20,
    maxWidth: 500,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    marginTop: 5,
  },
  appointmentInfo: {
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  infoPoint: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
    paddingLeft: 5,
  },
  scheduleSection: {
    marginBottom: 25,
    marginTop: 10,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 18,
    marginTop: 5,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#999',
  },
  calendarIcon: {
    fontSize: 16,
  },
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#006d3c',
    backgroundColor: '#006d3c',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: "#f58220",  
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 6,
    alignSelf: "center",         
    marginTop: 10,
    minWidth: 130,
    alignItems: "center",          
    justifyContent: "center",     
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  instructionTextContainer: {
    flexDirection: 'row',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 12,
    fontWeight: '500',
  },
  disabledText: {
    color: '#999',
  },
  slotText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginBottom: 15,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  goToAssessmentButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  goToAssessmentButtonText: {
    color: '#212529',
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#006d3c',
    borderRadius: 2,
  },
  formContainer: {
    maxHeight: 400,
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006d3c',
    marginTop: 25,
    marginBottom: 15,
    paddingTop: 5,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 12,
    paddingVertical: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 3,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#006d3c',
    borderColor: '#006d3c',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  completionCard: {
    backgroundColor: '#f8f9fa',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#006d3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  scheduleInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  scheduleText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  progressList: {
    marginTop: 10,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressDot: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  completedDot: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  pendingDot: {
    color: '#ccc',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  completedLabel: {
    color: '#333',
    fontWeight: '500',
  },
  table: { 
    marginTop: 15,
    marginBottom: 10,
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderColor: '#eee', 
    paddingVertical: 10
  },
  tableHeader: { 
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
  },  
  tableHeaderCell: { 
    flex: 1, 
    fontWeight: 'bold', 
    fontSize: 12, 
    color: '#333',
    paddingHorizontal: 8,
  },
  tableCell: { 
    flex: 1, 
    fontSize: 12, 
    color: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tableFooter: {
    backgroundColor: '#f1f1f1', 
    paddingVertical: 8, 
    justifyContent: 'center' 
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    minHeight: 44,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    maxHeight: 200,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#dc3545',
    fontSize: 14,
  },
  financeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  financeMainCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  leftSection: {
    marginBottom: 35,
  },
  rightSection: {
    marginTop: 15,
  },
  feesListContainer: {
    marginBottom: 35,
    marginTop: 10,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  feeNameColumn: {
    flex: 1,
    paddingRight: 20,
  },
  feeName: {
    fontSize: 15,
    color: '#000',
    marginBottom: 4,
  },
  feeFormula: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  feeAmount: {
    fontSize: 15,
    color: '#000',
    textAlign: 'right',
    minWidth: 100,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  optionRow: {
    flexDirection: 'column',
    marginBottom: 30,
    paddingVertical: 10,
  },
  optionContent: {
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18803b',
    marginBottom: 8,
  },
  optionSubtext: {
    fontSize: 13,
    color: '#333',
    lineHeight: 22,
  },
  optionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18803b',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  installmentSection: {
    marginBottom: 30,
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 5,
  },
  installmentHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  installmentLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    paddingRight: 10,
  },
  installmentDate: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  installmentAmount: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    textAlign: 'right',
    paddingLeft: 10,
  },
  installmentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  installmentTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  noteSection: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffa000',
    borderRadius: 6,
    padding: 20,
    marginTop: 10,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e65100',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 22,
  },
  finalEnrollmentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  finalEnrollmentCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#18803b',
    marginBottom: 15,
    marginTop: 5,
    textAlign: 'center',
  },
  congratsSubtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  downloadButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 35,
    shadowColor: '#27ae60',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '750',
    fontSize: 16,
    letterSpacing: 1,
  },
  certificatePreview: {
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    paddingTop: 25,
  },
  certHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18803b',
    textAlign: 'center',
    marginBottom: 8,
  },
  certSubheader: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  certAY: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 25,
  },
  certInfo: {
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  certInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  certInfoLabel: {
    fontWeight: '600',
  },
  certSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  certTable: {
    marginBottom: 15,
  },
  certNotice: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffa000',
    borderRadius: 6,
    padding: 20,
    marginTop: 25,
  },
  certNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e65100',
    marginBottom: 10,
  },
  certNoticeText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 22,
  },
});
export default StudentDashboard;