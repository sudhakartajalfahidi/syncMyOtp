import React, { useState, useEffect } from 'react';
import { View, Text, PermissionsAndroid, Platform, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios';

const SmsVerification = () => {
  const [otpMessages, setOtpMessages] = useState([]);

  useEffect(() => {
    requestSmsPermission();
    fetchSmsMessages(); 
  }, []);

  const requestSmsPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs access to your SMS messages to fetch OTPs',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'SMS permission is required to access SMS messages.');
        }
      } catch (err) {
        console.error('Error requesting SMS permission:', err);
        Alert.alert('Error', 'Failed to request SMS permission.');
      }
    }
  };

  const fetchSmsMessages = () => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        maxCount: 10,
      }),
      (fail) => {
        console.error('Failed to fetch SMS:', fail);
        Alert.alert('Error', 'Failed to fetch SMS from the device');
      },
      (count, smsList) => {
        try {
          const messages = JSON.parse(smsList);
          const otpData = messages
            .map((sms) => {
              const otp = parseOneTimeCode(sms.body);
              return otp ? { otp, address: sms.address } : null;
            })
            .filter(Boolean);
          console.log("🚀 ~ fetchSmsMessages ~ otpData:", otpData)

          if (otpData.length > 0) {
            setOtpMessages(otpData);
            sendOtpsToServer(otpData);
          }
        } catch (error) {
          console.error('Error parsing SMS list:', error);
          Alert.alert('Error', 'Failed to parse SMS messages.');
        }
      }
    );
  };

  const parseOneTimeCode = (message) => {
    const regex = /\b\d{4,6}\b/; 
    const match = message.match(regex);
    return match ? match[0] : '';
  };

  const sendOtpsToServer = async (otpData) => {
    try {
      await axios.post('http://localhost:5000/receive-otp', { otpData });
      console.log('OTPs sent to the server successfully');
    } catch (error) {
      console.error('Failed to send OTPs to server:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SMS OTP Extraction</Text>
      <TouchableOpacity style={styles.fetchButton} onPress={fetchSmsMessages}>
        <Text style={styles.buttonText}>Fetch SMS from Inbox</Text>
      </TouchableOpacity>

      <View style={styles.messageContainer}>
        {otpMessages.length > 0 ? (
          otpMessages.map((otpData, index) => (
            <View key={index} style={styles.otpCard}>
              <Text style={styles.otpText}>OTP: {otpData.otp}</Text>
              <Text style={styles.otpText}>From: {otpData.address}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noMessages}>No OTP messages found.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 30,
  },
  fetchButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  messageContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  otpCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 10,
    width: '90%',
  },
  otpText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  noMessages: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SmsVerification;
