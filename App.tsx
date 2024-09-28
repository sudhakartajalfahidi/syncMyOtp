import React from 'react';
import { SafeAreaView } from 'react-native';
import SmsVerification from './SmsVerification';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SmsVerification />
    </SafeAreaView>
  );
};

export default App;
