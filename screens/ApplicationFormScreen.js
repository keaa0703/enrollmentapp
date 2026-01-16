// ApplicationFormScreen.js - FIXED VERSION
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../firebase/config";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../firebase/config";
import { getAuth, signInAnonymously } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import { decode } from 'base-64';


import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";




const DRAFT_STORAGE_KEY = "@application_form_draft";

const ApplicationFormScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const [uploadedFiles, setUploadedFiles] = useState({
  picture: false,
  birthCert: false,
  schoolId: false,
  grades: false,
});


  // Add hardcopy flags like web version
  const [hardcopyFlags, setHardcopyFlags] = useState({
  pictureHardcopy: false,
  birthCertHardcopy: false,
  schoolIdHardcopy: false,
  gradesHardcopy: false,
});


  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    middleNameNA: false,
    lastName: "",
    email: "",
    mobile: "",
    category: "",
    program: "",
    gender: "",
    dob: null,
    picture: null,
    birthCert: null,
    schoolId: null,
    grades: null,
  });

  // Dropdown states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [categoryItems] = useState([
    { label: "New Student", value: "New Student" },
    { label: "Transferee", value: "Transferee" },
  ]);
  const [programItems, setProgramItems] = useState([]);

useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "departments"),
    (snapshot) => {
      const programs = snapshot.docs.map((doc) => ({
        label: doc.data().name,
        value: doc.data().name,
      }));
      setProgramItems(programs);
    },
    (error) => {
      console.error("Error fetching programs:", error);
    }
  );

  return () => unsubscribe();
}, []);

  const [genderItems] = useState([
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
  ]);

  // Load continuing student data
  useEffect(() => {
    const loadContinuingStudent = async () => {
      try {
        const studentDocId = await AsyncStorage.getItem("studentDocId");

        if (studentDocId) {
          const studentRef = doc(db, "students", studentDocId);
          const snap = await getDoc(studentRef);

          if (snap.exists()) {
            const data = snap.data();

            setForm((prev) => ({
              ...prev,
              firstName: data.firstName || "",
              middleName: data.middleName || "",
              middleNameNA: data.middleNameNA || false,
              lastName: data.lastName || "",
              email: data.email || "",
              mobile: data.mobile || "",
              category: data.category || "",
              program: data.program || "",
              gender: data.gender || "",
              dob: data.dob ? new Date(data.dob) : null,
              picture: data.picture ? { uri: data.picture } : null,
              birthCert: data.birthCert ? { uri: data.birthCert } : null,
              schoolId: data.schoolId ? { uri: data.schoolId } : null,
              grades: data.grades ? { uri: data.grades } : null,
            }));

            setUploadedFiles({
              picture: !!data.picture,
              birthCert: !!data.birthCert,
              schoolId: !!data.schoolId,
              grades: !!data.grades,
            });

            setHardcopyFlags({
              pictureHardcopy: data.pictureHardcopy || false,
              birthCertHardcopy: data.birthCertHardcopy || false,
              schoolIdHardcopy: data.schoolIdHardcopy || false,
              gradesHardcopy: data.gradesHardcopy || false,
            });

            console.log("Continuing student loaded:", data);
          }
        }
      } catch (err) {
        console.error("Error loading continuing student:", err);
      }
    };

    loadContinuingStudent();
  }, []);

  // Load draft from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);

          if (saved && saved.dob) {
            try {
              saved.dob = new Date(saved.dob);
            } catch (e) {
              saved.dob = null;
            }
          }

          setForm((prev) => ({ ...prev, ...saved }));
          setUploadedFiles({
            picture: Boolean(saved.picture?.uri),
            birthCert: Boolean(saved.birthCert?.uri),
            schoolId: Boolean(saved.schoolId?.uri),
            grades: Boolean(saved.grades?.uri),
          });
        }
      } catch (e) {
        console.warn("Failed to load draft:", e);
      }
    })();
  }, []);

  // Subscribe to student doc if studentDocId exists
  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      try {
        const studentDocId = await AsyncStorage.getItem("studentDocId");
        if (!studentDocId) return;

        const studentRef = doc(db, "students", studentDocId);
        unsubscribe = onSnapshot(
          studentRef,
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            setForm((prev) => {
              const next = { ...prev };
              const fieldsToMap = [
                "firstName",
                "middleName",
                "lastName",
                "email",
                "mobile",
                "category",
                "program",
                "gender",
                "dob",
              ];
              fieldsToMap.forEach((f) => {
                if (data[f] !== undefined && data[f] !== null) {
                  next[f] =
                    f === "dob" && typeof data[f] === "string"
                      ? new Date(data[f])
                      : data[f];
                }
              });

              ["picture", "birthCert", "schoolId", "grades"].forEach((key) => {
                if (data[key]) {
                  next[key] = {
                    uri: data[key],
                    name: data[key].split("/").pop(),
                    size: null,
                    mimeType: "",
                  };
                }
              });

              AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next)).catch(
                (e) => console.warn(e)
              );
              return next;
            });

            setUploadedFiles((prev) => ({
              picture: prev.picture || Boolean(data.picture),
              birthCert: prev.birthCert || Boolean(data.birthCert),
              schoolId: prev.schoolId || Boolean(data.schoolId),
              grades: prev.grades || Boolean(data.grades),
            }));
          },
          (err) => {
            console.warn("onSnapshot error:", err);
          }
        );
      } catch (e) {
        console.warn("Failed to subscribe to student doc:", e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveDraft = async (partial) => {
    try {
      const next = { ...form, ...partial };
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      saveDraft({ [field]: value });
      return next;
    });
  };

  const capitalizeWords = (text) => {
    if (!text) return "";
    return text
      .split(" ")
      .map((word) =>
        word.length ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
      )
      .join(" ");
  };

  const handleNameChange = (field, value) => {
    // Only allow letters and spaces, max 15 chars
    const filtered = value.replace(/[^a-zA-Z\s]/g, "").slice(0, 15);
    const capitalizedValue = capitalizeWords(filtered);
    handleChange(field, capitalizedValue);
  };

  const handleMobileChange = (value) => {
    const digitsOnly = value.replace(/\D/g, "");
    const limited = digitsOnly.slice(0, 11);
    handleChange("mobile", limited);
  };

  const handleEmailChange = (value) => {
    handleChange("email", value.toLowerCase());
  };

  const isValidEmail = (email) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  };

  const checkEmailExists = async (email) => {
    try {
      const q = query(collection(db, "students"), where("email", "==", email));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      throw new Error("Could not verify email availability");
    }
  };

  const isValidText = (val) => typeof val === "string" && val.trim().length >= 3 && val.trim().length <= 15;

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max

  const pickDocument = async (field) => {
    try {
      console.log("Opening picker for", field);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      const size = result.size || (result.assets?.[0]?.fileSize ?? null);
      console.log("DocumentPicker result:", result);

      let asset = null;

      if (result.canceled) {
        console.log("User cancelled document picker for", field);
        return;
      }

      if (result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
        const a = result.assets[0];
        asset = {
          uri: a.uri,
          name: a.name || a.fileName || a.filename || `${field}`,
          size: a.size ?? a.fileSize ?? null,
          mimeType: a.mimeType || a.type || "",
        };
      } else if (result.type === "success") {
        asset = {
          uri: result.uri,
          name: result.name || `${field}`,
          size: result.size ?? null,
          mimeType: result.mimeType ?? "",
        };
      }

      if (!asset || !asset.uri) {
        console.log("No asset selected for", field);
        return;
      }

      // Validate file size (5MB max)
      if (asset.size) {
        console.log(`File size for ${field}: ${formatFileSize(asset.size)}`);
        if (asset.size > MAX_FILE_SIZE) {
          const fileSize = formatFileSize(asset.size);
          const maxSize = formatFileSize(MAX_FILE_SIZE);
          Alert.alert(
            "❌ File Too Large",
            `Your file is ${fileSize}.\nMaximum allowed: ${maxSize}\n\nPlease select a smaller file.`
          );
          return;
        }
      } else {
        console.warn(`Could not determine file size for ${field}, allowing upload`);
      }

      const fileObj = {
        uri: asset.uri,
        name: asset.name || field,
        size: asset.size ?? null,
        mimeType: asset.mimeType ?? "",
      };

      console.log("File object created:", fileObj);

      handleChange(field, fileObj);
      setUploadedFiles((prev) => ({ ...prev, [field]: true }));
    } catch (error) {
      console.error("pickDocument error:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const removeFile = (field) => {
    handleChange(field, null);
    setUploadedFiles((prev) => ({ ...prev, [field]: false }));
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear draft:", e);
    }
  };

  
  const handleSubmit = async () => {
    setLoading(true);

    try {
      console.log("=== SUBMIT BUTTON PRESSED ===");
      console.log("Current form state:", JSON.stringify(form, null, 2));

      // Validation matching web version
      if (!form.category) {
        Alert.alert("Validation Error", "Please select a category");
        setLoading(false);
        return;
      }

      if (!form.program) {
        Alert.alert("Validation Error", "Please select a program");
        setLoading(false);
        return;
      }

      if (!isValidText(form.firstName)) {
        Alert.alert("Validation Error", "First name must be 3-15 characters");
        setLoading(false);
        return;
      }

      if (!form.middleNameNA && !isValidText(form.middleName)) {
        Alert.alert("Validation Error", "Middle name must be 3-15 characters or check N/A");
        setLoading(false);
        return;
      }

      if (!isValidText(form.lastName)) {
        Alert.alert("Validation Error", "Last name must be 3-15 characters");
        setLoading(false);
        return;
      }

      if (!form.gender) {
        Alert.alert("Validation Error", "Please select gender");
        setLoading(false);
        return;
      }

      if (!form.dob) {
        Alert.alert("Validation Error", "Please select date of birth");
        setLoading(false);
        return;
      }

      const age = calculateAge(form.dob);
      if (age < 18) {
        Alert.alert("Age Requirement", "You must be at least 18 years old");
        setLoading(false);
        return;
      }

      if (!form.mobile.startsWith("09") || form.mobile.length !== 11) {
        Alert.alert("Invalid Mobile", "Must start with 09 and be 11 digits");
        setLoading(false);
        return;
      }

      if (!isValidEmail(form.email)) {
        Alert.alert("Invalid Email", "Please enter a valid email");
        setLoading(false);
        return;
      }

      // Check required files (unless hardcopy flag is set)
      const fileFields = ["picture", "birthCert", "schoolId", "grades"];
      const hardcopyMap = {
        picture: hardcopyFlags.pictureHardcopy,
        birthCert: hardcopyFlags.birthCertHardcopy,
        schoolId: hardcopyFlags.schoolIdHardcopy,
        grades: hardcopyFlags.gradesHardcopy,
};

      // Retrieve existing student ID early for email validation
      const studentDocId = await AsyncStorage.getItem("studentDocId");
      console.log("📋 Retrieved studentDocId early for validation:", studentDocId);

      for (const field of fileFields) {
        if (!hardcopyMap[field] && !form[field]?.uri) {
          Alert.alert("Missing Document", `Please upload ${field} or mark as hardcopy`);
          setLoading(false);
          return;
        }
      }

      // Check for duplicate email in Firebase
      console.log("🔍 Checking if email already exists in Firebase...");
      console.log("Email to check:", form.email);
      
      try {
        const q = query(collection(db, "students"), where("email", "==", form.email));
        const existing = await getDocs(q);
        
        console.log("Query results - Documents found:", existing.docs.length);

        if (!existing.empty) {
          const existingDoc = existing.docs[0];
          console.log("Found existing document with email:", existingDoc.id);
          console.log("Current student ID from storage:", studentDocId);
          console.log("Are they the same?", existingDoc.id === studentDocId);
          
          // Allow if it's the same student updating their application
          if (!studentDocId || existingDoc.id !== studentDocId) {
            console.warn(`❌ Email already registered: ${form.email}`);
            Alert.alert(
              "⚠️ Email Already Registered",
              `The email "${form.email}" is already associated with an existing application.\n\nPlease use a different email address or contact support if you believe this is an error.`
            );
            setLoading(false);
            return;
          }
          console.log("✅ Email belongs to current user, proceeding...");
        } else {
          console.log("✅ Email is available for registration");
        }
      } catch (emailCheckError) {
        console.error("❌ Error checking email availability:", emailCheckError);
        Alert.alert(
          "Validation Error",
          "Could not verify email availability. Please check your internet connection and try again."
        );
        setLoading(false);
        return;
      }

      // Sign in anonymously for Firebase Storage rules
      console.log("Checking authentication...");
      const auth = getAuth();
if (!auth.currentUser) {
  console.log("Signing in anonymously...");
  const userCred = await signInAnonymously(auth);
  console.log("Signed in as UID:", userCred.user.uid);
}


      // Verify auth before proceeding
      if (!auth.currentUser) {
        Alert.alert("Error", "Authentication failed. Please try again.");
        setLoading(false);
        return;
      }
      console.log("Authentication verified, proceeding with upload...");

      // Create or get student document reference
      let studentRef;
      let studentId;

      if (studentDocId) {
        studentId = studentDocId;
        studentRef = doc(db, "students", studentId);
        console.log("♻️ Using existing student document:", studentId);
      } else {
        studentRef = doc(collection(db, "students"));
        studentId = studentRef.id;
        await AsyncStorage.setItem("studentDocId", studentId);
        await setDoc(studentRef, { createdAt: new Date().toISOString() });
        console.log("✨ Created new student document:", studentId);
      }



      // Upload files (only if not marked as hardcopy)
      const uploadedUrls = {};
      const uploadErrors = [];
      
      for (const field of fileFields) {
        if (hardcopyMap[field]) {
          uploadedUrls[field] = "";
      } else if (form[field]?.uri) {
          try {
            console.log(`Attempting to upload ${field}...`);
            uploadedUrls[field] = await uploadFileToStorage(form[field], studentId, field);
            console.log(`✅ ${field} uploaded successfully`);
          } catch (err) {
            console.error(`Upload failed for ${field}:`, err);
            
            // Check for specific error types
            if (err.code === 'storage/unauthorized') {
              uploadErrors.push(`${field}: Permission denied. Please contact support.`);
            } else if (err.code === 'storage/canceled') {
              uploadErrors.push(`${field}: Upload was canceled.`);
            } else if (err.code === 'storage/unknown') {
              uploadErrors.push(`${field}: Network error or server issue.`);
            } else {
              uploadErrors.push(`${field}: ${err.message || 'Upload failed'}`);
            }
          }
        }
      }

      // If all uploads failed, show error
      if (uploadErrors.length > 0 && Object.keys(uploadedUrls).length === 0) {
        Alert.alert(
          "Upload Failed",
          "All file uploads failed. Please check:\n\n" +
          "1. Your internet connection\n" +
          "2. Firebase Storage is configured\n" +
          "3. Storage rules allow uploads\n\n" +
          uploadErrors.join('\n')
        );
        setLoading(false);
        return;
      }

      

      // Prepare student data matching web version structure
      const studentData = {
        category: form.category,
        program: form.program,
        firstName: form.firstName,
        middleName: form.middleName,
        middleNameNA: form.middleNameNA,
        lastName: form.lastName,
        gender: form.gender,
        dob: form.dob ? new Date(form.dob).toISOString().split("T")[0] : null,
        mobile: form.mobile,
        email: form.email,
        grades: uploadedUrls.grades || "",
        gradesHardcopy: hardcopyFlags.gradesHardcopy || false,
        picture: uploadedUrls.picture || "",
        pictureHardcopy: hardcopyFlags.pictureHardcopy || false,
        birthCert: uploadedUrls.birthCert ||"",
        birthCertHardcopy: hardcopyFlags.birthCertHardcopy || false,
        schoolId: uploadedUrls.schoolId || "",
        schoolIdHardcopy: hardcopyFlags.schoolIdHardcopy || false,
        createdAt: new Date().toISOString(),
        uploadErrors: uploadErrors.length > 0 ? uploadErrors : null,
      };

      console.log("Saving to Firestore...", studentData);

      // Save to Firestore
      await setDoc(studentRef, studentData, { merge: true });

      console.log("Application saved successfully!");

      const hasHardcopy = Object.values(hardcopyMap).some(v => v);
      const hasErrors = uploadErrors.length > 0;

      Alert.alert(
        "✅ Application Submitted",
        hasHardcopy || hasErrors
          ? "Saved! Please submit missing documents to the admissions office."
          : "Saved! Please wait for your email with login credentials.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );

      // Clear form
      setForm({
        firstName: "",
        middleName: "",
        middleNameNA: false,
        lastName: "",
        email: "",
        mobile: "",
        category: "",
        program: "",
        gender: "",
        dob: null,
        picture: null,
        birthCert: null,
        schoolId: null,
        grades: null,
      });
      setUploadedFiles({
        picture: false,
        birthCert: false,
        schoolId: false,
        grades: false,
      });
      setHardcopyFlags({
        pictureHardcopy: false,
        birthCertHardcopy: false,
        schoolIdHardcopy: false,
        gradesHardcopy: false,
      });
      await clearDraft();

    } catch (err) {
      console.error("Submission error:", err);
      Alert.alert("Error", `Failed to submit application: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const base64ToBytes = (base64String) => {
    try {
      // Use base-64 library for React Native compatibility
      const binaryString = decode(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('Error converting base64 to bytes:', error);
      throw new Error('Failed to process file data');
    }
  };

  const uploadFileToStorage = async (file, studentId, field) => {
  console.log(`📤 Uploading ${field}...`);

  const auth = getAuth();
  if (!auth.currentUser) throw new Error("Not authenticated");

  try {
    // Validate file size before upload (5MB max)
    if (file.size && file.size > MAX_FILE_SIZE) {
      const fileSize = formatFileSize(file.size);
      const maxSize = formatFileSize(MAX_FILE_SIZE);
      throw new Error(`File size ${fileSize} exceeds maximum allowed ${maxSize}`);
    }

    // Read file as base64 using Expo FileSystem
    console.log(`📖 Reading file from URI: ${file.uri}`);
    const base64Data = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });
    console.log(`✅ File read successfully, size: ${base64Data.length} chars`);

    // Validate base64 data
    if (!base64Data || typeof base64Data !== 'string' || base64Data.length === 0) {
      throw new Error(`Invalid file data for ${field}`);
    }

    // Determine MIME type
    let mimeType = file.mimeType || 'application/octet-stream';
    if (!mimeType || mimeType === "application/octet-stream") {
      const ext = file.name?.split(".").pop()?.toLowerCase();
      if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "heic") mimeType = "image/heic";
    }

    // Safe file name
    const safeName = (file.name || field).replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${field}_${Date.now()}_${safeName}`;

    const fileRef = ref(storage, `students_uploads/${studentId}/${fileName}`);

    const metadata = {
      contentType: mimeType,
      customMetadata: { ownerUid: auth.currentUser.uid },
    };

    // Upload using uploadString with base64 - most reliable for mobile
    console.log(`📤 Starting upload of ${field} to Firebase Storage...`);
    console.log(`🔍 MIME type: ${mimeType}`);
    await uploadString(fileRef, base64Data, 'base64', metadata);
    console.log(`✅ ${field} uploaded to Storage, getting download URL...`);

    // Return download URL
    const downloadURL = await getDownloadURL(fileRef);
    console.log(`🎉 ${field} uploaded successfully:`, downloadURL);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading ${field}:`, error);
    throw error;
  }
};



  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleClear = () => {
    Alert.alert("Clear Form", "Are you sure you want to clear the form?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          setForm({
            firstName: "",
            middleName: "",
            middleNameNA: false,
            lastName: "",
            email: "",
            mobile: "",
            category: "",
            program: "",
            gender: "",
            dob: null,
            picture: null,
            birthCert: null,
            schoolId: null,
            grades: null,
          });
          setUploadedFiles({
            picture: false,
            birthCert: false,
            schoolId: false,
            grades: false,
          });
          setHardcopyFlags({
            pictureHardcopy: false,
            birthCertHardcopy: false,
            schoolIdHardcopy: false,
            gradesHardcopy: false,
          });
          await clearDraft();
          Alert.alert("Cleared", "Form cleared successfully");
        },
      },
    ]);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderUploadField = (fieldKey, label, showImagePreview = false) => {
    const file = form[fieldKey];
    const isUploaded = uploadedFiles[fieldKey];
    const hardcopyKey = `${fieldKey}Hardcopy`;
    const isHardcopy = hardcopyFlags[hardcopyKey];

    return (
      <View style={{ marginBottom: 10 }}>
        <TouchableOpacity
          style={[styles.uploadBtn, isUploaded && styles.uploadBtnSuccess]}
          onPress={() => pickDocument(fieldKey)}
          disabled={isHardcopy}
        >
          <Text style={styles.uploadText}>
            {isUploaded ? `✓ ${label} Uploaded` : label}
          </Text>
        </TouchableOpacity>

        {isUploaded && file ? (
          <View style={styles.uploadPreview}>
            {showImagePreview && file.uri && (file.mimeType?.startsWith("image") || file.name?.match(/\.(jpg|jpeg|png)$/i)) ? (
              <Image source={{ uri: file.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.fileIconPlaceholder}>
                <Text style={{ color: "#444" }}>{file.name || "Uploaded file"}</Text>
              </View>
            )}
            <View style={styles.fileMeta}>
              <Text style={styles.fileName}>{file.name || "File attached"}</Text>
              {file.size ? <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => removeFile(fieldKey)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isHardcopy && (
          <View style={styles.hardcopyNotice}>
            <Text style={styles.hardcopyText}>
              ℹ️ You selected to submit a physical hard copy later
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            const newVal = !isHardcopy;
            setHardcopyFlags(prev => ({ ...prev, [hardcopyKey]: newVal }));
            if (newVal) {
              removeFile(fieldKey);
            }
          }}
          style={styles.checkboxContainer}
        >
          <Text style={styles.checkBox}>
            {isHardcopy ? "☑" : "☐"} I will submit physical hard copy later
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.applicationpage, { marginTop: 80 }]}>Application</Text>
        
        <Text style={styles.label}>Category *</Text>
        <DropDownPicker
          open={categoryOpen}
          value={form.category}
          items={categoryItems}
          setOpen={setCategoryOpen}
          setValue={(callback) => {
            const newValue = typeof callback === "function" ? callback(form.category) : callback;
            handleChange("category", newValue);
          }}
          placeholder="Select Category"
          style={styles.dropdown}
          zIndex={3000}
          zIndexInverse={1000}
          listMode="SCROLLVIEW"
          dropDownContainerStyle={{ maxHeight: 220 }}
        />

        <Text style={styles.label}>Program *</Text>
        <DropDownPicker
          open={programOpen}
          value={form.program}
          items={programItems}
          setOpen={setProgramOpen}
          setValue={(callback) => {
            const newValue = typeof callback === "function" ? callback(form.program) : callback;
            handleChange("program", newValue);
          }}
          placeholder="Select Program"
          style={styles.dropdown}
          zIndex={2000}
          zIndexInverse={2000}
          listMode="SCROLLVIEW"
          dropDownContainerStyle={{ maxHeight: 320 }}
        />

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={form.firstName}
          onChangeText={(text) => handleNameChange("firstName", text)}
          placeholder="Enter first name"
          maxLength={15}
        />

        <Text style={styles.label}>Middle Name</Text>
        <TextInput
          style={styles.input}
          value={form.middleNameNA ? "" : form.middleName}
          editable={!form.middleNameNA}
          onChangeText={(text) => handleNameChange("middleName", text)}
          placeholder="Enter middle name"
          maxLength={15}
        />

        <TouchableOpacity onPress={() => handleChange("middleNameNA", !form.middleNameNA)}>
          <Text style={styles.checkBox}>
            {form.middleNameNA ? "☑" : "☐"} Middle name not applicable
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={styles.input}
          value={form.lastName}
          onChangeText={(text) => handleNameChange("lastName", text)}
          placeholder="Enter last name"
          maxLength={15}
        />

        <Text style={styles.label}>Gender *</Text>
        <DropDownPicker
          open={genderOpen}
          value={form.gender}
          items={genderItems}
          setOpen={setGenderOpen}
          setValue={(callback) => {
            const newValue = typeof callback === "function" ? callback(form.gender) : callback;
            handleChange("gender", newValue);
          }}
          placeholder="Select Gender"
          style={styles.dropdown}
          zIndex={1000}
          zIndexInverse={3000}
          listMode="SCROLLVIEW"
          dropDownContainerStyle={{ maxHeight: 180 }}
        />

        <Text style={styles.label}>Date of Birth * (Must be 18+)</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: form.dob ? "#000" : "#888" }}>
            {form.dob ? form.dob.toLocaleDateString() : "Select date of birth"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={form.dob || new Date(2000, 0, 1)}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const age = calculateAge(selectedDate);
                if (age < 18) {
                  Alert.alert("Age Requirement", "You must be at least 18 years old");
                  return;
                }
                handleChange("dob", selectedDate);
              }
            }}
          />
        )}

        <Text style={styles.label}>Mobile Number * (09XXXXXXXXX)</Text>
        <TextInput
          style={styles.input}
          value={form.mobile}
          onChangeText={handleMobileChange}
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          maxLength={11}
        />
        {form.mobile && (!form.mobile.startsWith("09") || form.mobile.length !== 11) && (
          <Text style={styles.errorText}>
            Must start with 09 and be 11 digits
          </Text>
        )}

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={handleEmailChange}
          placeholder="example@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {form.email && !isValidEmail(form.email) && (
          <Text style={styles.errorText}>Invalid email format</Text>
        )}

        <View style={styles.uploadNoticeBox}>
          <Text style={styles.uploadNoticeTitle}>📎 Attachments Required</Text>
          <Text style={styles.uploadNoticeText}>
            Upload attachments (JPG, PNG, PDF, max 5MB) or mark as "physical hard copy" to submit later at admissions office.
          </Text>
        </View>

        {renderUploadField("picture", "2x2 Picture *", true)}
        {renderUploadField("birthCert", "Birth/Marriage Certificate *", false)}
        {renderUploadField("schoolId", "School/Government ID *", false)}
         {renderUploadField("grades", "Copy of Grades *", false)}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.outlineButton, styles.clearOutline]}
            onPress={handleClear}
            disabled={loading}
          >
            <Text style={styles.outlineTextClear}>CLEAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, styles.closeOutline]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.outlineTextClose}>CLOSE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filledButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.filledText}>SUBMIT</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, marginBottom: 5, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  dropdown: {
    marginBottom: 15,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  checkBox: { marginBottom: 15, fontSize: 13, color: "#555" },
  checkboxContainer: { marginTop: 8 },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
  },
  uploadNoticeBox: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  applicationpage: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0c1014ff",
    marginBottom: 8,
    alignSelf: "center",
  },
  uploadNoticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1565c0",
    marginBottom: 8,
  },
  uploadNoticeText: {
    fontSize: 13,
    color: "#424242",
    lineHeight: 20,
  },
  uploadBtn: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  uploadBtnSuccess: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  uploadText: { color: "#333", fontWeight: "500" },
  uploadPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 10,
    resizeMode: "cover",
    backgroundColor: "#f0f0f0",
  },
  fileIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    borderWidth: 1,
    borderColor: "#eee",
  },
  fileMeta: {
    flex: 1,
    justifyContent: "center",
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },
  fileSize: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: "#d9534f",
    fontWeight: "700",
    fontSize: 13,
  },
  hardcopyNotice: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ffc107",
  },
  hardcopyText: {
    fontSize: 12,
    color: "#856404",
  },
  buttonRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  outlineButton: {
    width: 110,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginRight: 10,
  },
  clearOutline: {
    borderColor: "#f57c00",
  },
  closeOutline: {
    borderColor: "#dcefe0",
    backgroundColor: "#ffffff",
  },
  outlineTextClear: {
    color: "#f57c00",
    fontWeight: "700",
    letterSpacing: 1,
  },
  outlineTextClose: {
    color: "#0ea45b",
    fontWeight: "700",
    letterSpacing: 1,
  },
  filledButton: {
    minWidth: 140,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#0ea45b",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  filledText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
});

export default ApplicationFormScreen;