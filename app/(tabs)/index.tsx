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

  // INLINE DÜZENLEME DURUMU:
  // Hangi öğenin düzenlendiğini ve düzenleme alanındaki metni takip ediyoruz.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');


  // Yeni görev ekleme işlevi
  const addTodo = useCallback(() => {

    // Giriş metnini al ve boşlukları kırp
   const text = input.trim();
   if(!text) return; // Boşsa çık

   //Metin tekrarını engele (Büyük küçük harfe duyarlı)
   const exists = todos.some(t=> t.text.toLocaleLowerCase("tr-TR") === text.toLocaleLowerCase("tr-TR"));

   // Aynı görev zaten mevcutsa uyarı ver ve çık
   if(exists) {
    alert("Aynı görev zaten mevcut!");
    setInput('');
    return;
   }

    // Yeni görev oluştur ve listeye ekle
    const next: Todo = { id: makeId(), text, done: false };
    setTodos(prev => [next, ...prev]);
    setInput('');
  }, [input, todos]);

    // Tamamla/geri al
  const toggleTodo = useCallback((id: string) => {
    // Düzenleme modunda iken tıklama ile yanlışlıkla done değişmesin
    if (editingId && editingId === id) return;
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }, [editingId]);

    // Tamamlananları temizle
  const clearCompleted = useCallback(() => {
    setTodos(prev => prev.filter(t => !t.done));
    // Düzenlenen öğe tamamlanmış taraftaysa ve uçtuysa düzenleme durumunu sıfırla
    if (editingId) {
      const stillExists = todos.some(t => t.id === editingId && !t.done);
      if (!stillExists) {
        setEditingId(null);
        setEditingText('');
      }
    }
  }, [editingId, todos]);

    // Düzenlemeyi başlat
  const startEditing = useCallback((id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  }, []);

  // Düzenlemeyi iptal
  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);


    // Düzenlemeyi kaydet
  const saveEditing = useCallback(() => {
    if (!editingId) return;
    const text = editingText.trim();
    if (!text) {
      // Boş kaydetmeyi engelle; istersen burada otomatik sil de yapabilirsin.
      return;
    }
    // Aynı metin başka bir öğede varsa (kendisi hariç) engelle
    const duplicate = todos.some(
      t =>
        t.id !== editingId &&
        t.text.toLocaleLowerCase('tr-TR') === text.toLocaleLowerCase('tr-TR')
    );
    if (duplicate) return;

    setTodos(prev => prev.map(t => (t.id === editingId ? { ...t, text } : t)));
    setEditingId(null);
    setEditingText('');
  }, [editingId, editingText, todos]);


  } // end of addTodo

} //end of TodoApp
