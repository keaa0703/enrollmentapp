import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Button, StyleSheet, TextInput, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';

const API_BASE_URL = 'http://localhost:5003/api';

const UpdateProfileScreen = () => {
  const route = useRoute();
  const { studentId, email } = route.params;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/student/${studentId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load profile');
        }
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchProfile();
    }
  }, [studentId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
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

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>No profile data found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Welcome, {profile.firstName} {profile.lastName}</Text>

      <Text style={styles.sectionTitle}>Student Info</Text>
      <Text>ID: {profile.studentId}</Text>
      <Text>Email: {profile.email}</Text>
      <Text>Status: {profile.status}</Text>

      <Text style={styles.sectionTitle}>Basic Information</Text>
      <Text>Birth Date: {profile.birthDate}</Text>
      <Text>Gender: {profile.gender}</Text>
      <Text>Mobile No: {profile.mobileNo}</Text>

      <Text style={styles.sectionTitle}>Address</Text>
      <Text>{profile.address?.houseNo}, {profile.address?.barangay}, {profile.address?.city}</Text>
      <Text>{profile.address?.province}, {profile.address?.country} {profile.address?.postalCode}</Text>

      <Text style={styles.sectionTitle}>Present Address</Text>
      <Text>{profile.presentAddress?.houseNo}, {profile.presentAddress?.barangay}, {profile.presentAddress?.city}</Text>
      <Text>{profile.presentAddress?.province}, {profile.presentAddress?.country} {profile.presentAddress?.postalCode}</Text>

      <Text style={styles.sectionTitle}>Course Details</Text>
      <Text>Program: {profile.program}</Text>
      <Text>Entry Level: {profile.entryLevel}</Text>
      <Text>Student Type: {profile.studentType}</Text>

      <Text style={styles.sectionTitle}>Requirements</Text>
      {profile.requirements?.length ? (
        profile.requirements.map((req, index) => (
          <View key={index} style={styles.requirementItem}>
            <Text>{req.name} - {req.type} - {req.size}</Text>
            <Text>File: {req.file}</Text>
          </View>
        ))
      ) : (
        <Text>No uploaded requirements.</Text>
      )}

      <View style={{ marginVertical: 20 }}>
        <Button title="Edit Profile" onPress={() => Alert.alert('Edit profile not implemented.')} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  error: {
    color: 'red',
  },
  requirementItem: {
    marginVertical: 4,
  },
});

export default UpdateProfileScreen;
