// index.tsx 
/*
• Todo List Uygulaması
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

// Tek bir görev öğesi bileşeni
export type Todo ={
  id: string;
  text: string;
  done:boolean
}

// Filter Türü
type Filter = 'ALL' | 'ACTIVE' | 'DONE';


// Basit, güvenli kimlik üretici
const makeId = () => {
  // @ts-ignore bazı RN ortamlarında crypto olmayabilir
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    // @ts-ignore
    return (globalThis as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

// Ana uygulama bileşeni
export default function TodoApp() {
 // Üst bardaki giriş kutusu
  const [input, setInput] = useState<string>('');

    // ToDo listesi
  const [todos, setTodos] = useState<Todo[]>([]);

  // Aktif filtre
  const [filter, setFilter] = useState<Filter>('ALL');



  // Yeni görev ekleme işlevi
  const addTodo = useCallback(() => {

    // Giriş metnini al ve boşlukları kırp
   const text = input.trim();
   if(!text) return; // Boşsa çık

  } // end of addTodo

} //end of TodoApp
