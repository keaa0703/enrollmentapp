import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import uuid from 'react-native-uuid';
import * as FileSystem from 'expo-file-system';
import { signInAnonymously } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';



const capitalizeWords = (str) => str.replace(/\b\w/g, (char) => char.toUpperCase());

const ApplicationFormScreen = () => {
  const [form, setForm] = useState({
    category: '',
    program: '',
    lastName: '',
    firstName: '',
    middleName: '',
    birthDate: '',
    mobile: '',
    email: '',
  });

  const [files, setFiles] = useState({
    picture: null,
    grades: null,
    psa: null,
    schoolId: null,
  });

  const navigation = useNavigation();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categoryOptions = [
    { label: 'New Student', value: 'new' },
    { label: 'Old Student', value: 'old' },
  ];

  const programOptions = [
    { label: 'BSIT', value: 'BSIT' },
    { label: 'BSBA', value: 'BSBA' },
    { label: 'BSED', value: 'BSED' },
  ];

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => setIsSignedIn(true))
      .catch((error) => {
        console.error('Anonymous sign-in failed:', error);
        Alert.alert('Auth Error', 'Sign-in failed.');
      });
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const querySnap = await getDocs(collection(db, 'applications'));
    const data = querySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setApplications(data);
  };

  const handleChange = (key, value) => {
    if (['lastName', 'firstName', 'middleName'].includes(key)) value = capitalizeWords(value);
    if (key === 'mobile') value = value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickFile = async (key) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.assets?.[0]?.uri?.startsWith('file://')) {
        setFiles((prev) => ({ ...prev, [key]: result.assets[0].uri }));
      } else Alert.alert('No file selected');
    } catch (error) {
      console.error('Pick file error:', error);
      Alert.alert('Error', error.message);
    }
  };

  



  const validateForm = () => {
    for (const key in form) if (!form[key]?.trim()) return Alert.alert('Fill out', key), false;
    if (!/^09\d{9}$/.test(form.mobile)) return Alert.alert('Invalid mobile'), false;
    if (!/\S+@\S+\.\S+/.test(form.email)) return Alert.alert('Invalid email'), false;
    for (const key in files) if (!files[key]) return Alert.alert('Upload', key), false;
    return true;
  };


const handleSubmit = async () => {
  if (!isSignedIn) {
    Alert.alert('Please wait', 'Signing in to Firebase. Try again shortly.');
    return;
  }

  if (!validateForm()) return;

  setIsLoading(true);
  try {
    const newApp = {
      ...form,
      ...files,
      status: 'pending', // ✅ Add pending status
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'applications'), newApp);

    Alert.alert(
      'Success',
      'Your application has been submitted.',
      [
        {
          text: 'OK',
          onPress: () => navigation.replace('LoginScreen'), // ✅ Redirect to login
        },
      ]
    );

    fetchApplications(); // optional
  } catch (err) {
    console.error('Submit error:', err);
    Alert.alert('Error', err.message || 'Submit failed. Check console.');
  } finally {
    setIsLoading(false);
  }
};



  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) handleChange('birthDate', selectedDate.toISOString().split('T')[0]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Application Form</Text>

        <Text style={styles.label}>Category</Text>
        <DropDownPicker
          open={categoryOpen}
          value={form.category}
          items={categoryOptions}
          setOpen={setCategoryOpen}
          setValue={(cb) => handleChange('category', cb())}
          setItems={() => {}}
          style={styles.dropdown}
          zIndex={3000}
          zIndexInverse={1000}
        />

        <Text style={styles.label}>Program</Text>
        <DropDownPicker
          open={programOpen}
          value={form.program}
          items={programOptions}
          setOpen={setProgramOpen}
          setValue={(cb) => handleChange('program', cb())}
          setItems={() => {}}
          style={styles.dropdown}
          zIndex={2000}
          zIndexInverse={2000}
        />

        {['lastName', 'firstName', 'middleName'].map((key) => (
          <View key={key}>
            <Text style={styles.label}>{key.replace(/([A-Z])/, ' $1')}</Text>
            <TextInput
              style={styles.input}
              value={form[key]}
              onChangeText={(text) => handleChange(key, text)}
            />
          </View>
        ))}

        <Text style={styles.label}>Birth Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{form.birthDate || 'Select Date'}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.birthDate ? new Date(form.birthDate) : new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          value={form.mobile}
          onChangeText={(text) => handleChange('mobile', text)}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => handleChange('email', text)}
        />

        <Text style={styles.subTitle}>Upload Documents</Text>
        {['picture', 'grades', 'psa', 'schoolId'].map((key) => (
          <View key={key} style={styles.fileGroup}>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickFile(key)}>
              <Text style={styles.uploadText}>Upload {key.toUpperCase()}</Text>
            </TouchableOpacity>
            {files[key] && (files[key].toLowerCase().endsWith('.pdf') ? (
              <Text style={{ fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
                📄 {files[key].split('/').pop()}
              </Text>
            ) : (
              <Image source={{ uri: files[key] }} style={styles.imagePreview} />
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={{ backgroundColor: '#28a745', paddingVertical: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' }}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            {isLoading ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>

        {applications.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.subTitle}>Submitted Applications</Text>
            {applications.map((app) => (
              <Text key={app.id}>
                {app.lastName}, {app.firstName} - {app.program} ({app.category})
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f2f6fa',
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
  },
  input: {
    height: 44,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6d6d6',
    marginBottom: 10,
    fontSize: 14,
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#d6d6d6',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  fileGroup: {
    marginBottom: 16,
  },
  uploadBtn: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreview: {
    width: 90,
    height: 90,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignSelf: 'center',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 5,
    color: '#444',
  },
});

export default ApplicationFormScreen;
