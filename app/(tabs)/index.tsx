// index.tsx 
/*
• Firebase yoktur
• İsteğe bağlı kalıcılık (AsyncStorage) için en altta yorumlu şablon var.
*/

// React temel bileşen ve React Native bileşenleri içe aktarılıyor
import React, { useCallback, useMemo, useState } from 'react';

// React Native bileşenleri içe aktarılıyor.
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
