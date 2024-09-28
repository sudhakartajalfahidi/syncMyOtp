import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, PermissionsAndroid, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import axios from 'axios';

const SmsVerification = () => {
  const [otpMessages, setOtpMessages] = useState([]);
  const [isPolling, setIsPolling] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      requestSmsPermission();
    }

    let intervalId;
    if (isPolling && isLoggedIn) {
      intervalId = setInterval(() => {
        fetchSmsMessages();
      }, 30000); // Poll every 30 seconds
    }

    return () => clearInterval(intervalId);
  }, [isPolling, isLoggedIn]);

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://172.16.20.208:6000/login', { username, password });
      setToken(response.data.token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Invalid credentials');
    }
  };

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
    console.log('Fetching SMS messages...');
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
          // Sort messages by date in descending order to get the latest one
          messages.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          const latestOtp = messages
            .map((sms) => parseOneTimeCode(sms.body))
            .find((otp) => otp !== '');

          if (latestOtp) {
            setOtpMessages([latestOtp]); // Store only the latest OTP
            setIsPolling(false);
            sendOtpsToServer([latestOtp]);
          }
        } catch (error) {
          console.error('Error parsing SMS list:', error);
          Alert.alert('Error', 'Failed to parse SMS messages.');
        }
      }
    );
  };

  const parseOneTimeCode = (message) => {
    const regex = /\b\d{4,10}\b/; // Adjust regex if needed
    const match = message.match(regex);
    return match ? match[0] : '';
  };

  const sendOtpsToServer = async (otps) => {
    try {
      await axios.post('http://172.16.20.208:6000/receive-otp', { otp: otps }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('OTPs sent to the server successfully');
    } catch (error) {
      console.error('Failed to send OTPs to server:', error);
    }
  };

  return (
    <View style={styles.container}>
      {!isLoggedIn ? (
        <View style={styles.loginContainer}>
          <Text style={styles.header}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.header}>SMS OTP Extraction</Text>
          <TouchableOpacity style={styles.fetchButton} onPress={fetchSmsMessages}>
            <Text style={styles.buttonText}>Fetch SMS from Inbox</Text>
          </TouchableOpacity>

          <View style={styles.messageContainer}>
            {otpMessages.length > 0 ? (
              otpMessages.map((otp, index) => (
                <View key={index} style={styles.otpCard}>
                  <Text style={styles.otpText}>{otp}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noMessages}>No OTP messages found.</Text>
            )}
          </View>
        </>
      )}
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
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
