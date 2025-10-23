// index.tsx
/*
• Todo List Uygulaması
• Firebase yoktur
• İsteğe bağlı kalıcılık (AsyncStorage) için en altta yorumlu şablon var.
*/

// React temel bileşen ve React Native bileşenleri içe aktarılıyor
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

// css dosyası içe aktarılıyor
import { StyleSheet } from 'react-native';


import AsyncStorage from '@react-native-async-storage/async-storage';
// Tek bir görev yapısı
export type Todo = {
  id: string;
  text: string;
  done: boolean;
};

// Filtre türü
type Filter = 'ALL' | 'ACTIVE' | 'DONE';

// Basit, güvenli kimlik üretici

// UUID yoksa tarih+random karışımı kullanır
const makeId = () => {
  // @ts-ignore bazı RN ortamlarında crypto olmayabilir
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    // @ts-ignore
    return (globalThis as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

// Ana uygulama bileşeni
export default function App() {
  // Üst bardaki giriş kutusu
  const [input, setInput] = useState<string>('');
  // Görevler listesi
  const [todos, setTodos] = useState<Todo[]>([]);
  // Aktif filtre
  const [filter, setFilter] = useState<Filter>('ALL');

  // ASENKRON DEPOLAMA YÜKLEME/KAYDETME:
  // Uygulama başlatıldığında görevleri yükle
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('todos');
        if (raw) setTodos(JSON.parse(raw));
      } catch (e) {
        console.warn('Görevleri yüklerken hata:', e);
      }
    })();
  }, []);

  // Görevler değiştiğinde kaydet
  // Her değişiklikte kaydetmek performans sorunlarına yol açabilir; küçük uygulamalar için kabul edilebilir.
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('todos', JSON.stringify(todos));
      } catch (e) {
        console.warn('Görevleri kaydederken hata:', e);
      }
    })();
  }, [todos]);

  // INLINE DÜZENLEME DURUMU:
  // Hangi öğenin düzenlendiğini ve düzenleme alanındaki metni takip ediyoruz.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Yeni görev ekle
  const addTodo = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    // Metin tekrarı engeli (büyük/küçük duyarsız)
    const exists = todos.some(
      (t) => t.text.toLocaleLowerCase('tr-TR') === text.toLocaleLowerCase('tr-TR')
    );

    // Tekrar varsa ekleme, sadece giriş kutusunu temizle
    if (exists) {
      setInput('');
      return;
    }

    // Yeni görev ekle
    const next: Todo = { id: makeId(), text, done: false };
    setTodos((prev) => [next, ...prev]);
    setInput('');
  }, [input, todos]);

  // Tamamla/geri al
  const toggleTodo = useCallback(
    (id: string) => {
      // Düzenleme modunda iken tıklama ile yanlışlıkla done değişmesin
      if (editingId && editingId === id) return;
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    },
    [editingId]
  );

  // Sil
  const removeTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      // Eğer silinen öğe düzenleniyorsa düzenleme modunu kapat
      if (editingId === id) {
        setEditingId(null);
        setEditingText('');
      }
    },
    [editingId]
  );

  // Tamamlananları temizle
  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.done));
    // Düzenlenen öğe tamamlanmış taraftaysa ve uçtuysa düzenleme durumunu sıfırla
    if (editingId) {
      const stillExists = todos.some((t) => t.id === editingId && !t.done);
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
      (t) =>
        t.id !== editingId && t.text.toLocaleLowerCase('tr-TR') === text.toLocaleLowerCase('tr-TR')
    );

    // Çoğaltma varsa kaydetme
    if (duplicate) return;

    // Güncelle ve düzenleme modundan çık
    setTodos((prev) => prev.map((t) => (t.id === editingId ? { ...t, text } : t)));
    setEditingId(null);
    setEditingText('');
  }, [editingId, editingText, todos]);

  // Filtreli görünüm
  const filtered = useMemo(() => {
    switch (filter) {
      case 'ACTIVE':
        return todos.filter((t) => !t.done);
      case 'DONE':
        return todos.filter((t) => t.done);
      default:
        return todos;
    }
  }, [todos, filter]);

  // Sayaçlar
  const totalCount = todos.length;

  // Tamamlanmış görev sayısı
  const doneCount = useMemo(() => todos.filter((t) => t.done).length, [todos]);

  // Liste öğesi
  const renderItem = useCallback(
    ({ item }: { item: Todo }) => {
      const isEditing = item.id === editingId;

      // DÜZENLEME MODU: TextInput + Kaydet/İptal, Sil butonu gizlenir.
      if (isEditing) {
        return (
          <View style={[styles.row, styles.rowEditing]}>
            <View style={styles.checkbox /* düzenleme modunda pasif */} />
            {/* Düzenleme metin girişi  */}
            <TextInput
              style={[styles.todoText, styles.editInput]}
              value={editingText}
              onChangeText={setEditingText}
              placeholder="Görev metnini düzenle…"
              placeholderTextColor="#9aa0a6"
              maxLength={120}
              autoFocus
              onSubmitEditing={saveEditing} // Klavyeden Kaydet
              returnKeyType="done"
            />

            {/* Kaydet butonu */}
            <Pressable
              onPress={saveEditing}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.saveBtn,
                pressed && styles.actionPressed,
              ]}
              accessibilityLabel="Kaydet"
            >
              <Text style={styles.actionTextStrong}>Kaydet</Text>
            </Pressable>

            {/* İptal butonu */}
            <Pressable
              onPress={cancelEditing}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.cancelBtn,
                pressed && styles.actionPressed,
              ]}
              accessibilityLabel="İptal"
            >
              <Text style={styles.actionText}>İptal</Text>
            </Pressable>
          </View>
        );
      }

      // NORMAL MOD: checkbox + metin + (Düzenle, Sil) butonları
      return (
        // Tekrar dokunma ve uzun basma için erişilebilirlik rolleri ve etiketler eklendi
        <Pressable
          onPress={() => toggleTodo(item.id)}
          onLongPress={() => removeTodo(item.id)}
          android_ripple={{ color: '#00000014' }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Görev: ${item.text}`}
          accessibilityHint="Dokunarak tamamla/geri al; uzun basarak sil"
        >
          {/* Checkbox */}
          <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
            {item.done ? <View style={styles.checkboxInner} /> : null}
          </View>

          {/* Görev metni */}
          <Text style={[styles.todoText, item.done && styles.todoTextDone]} numberOfLines={2}>
            {item.text}
          </Text>

          {/* Düzenle butonu */}
          <Pressable
            onPress={() => startEditing(item.id, item.text)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.editBtn,
              pressed && styles.actionPressed,
            ]}
            accessibilityLabel="Düzenle"
          >
            <Text style={styles.actionText}>Düzenle</Text>
          </Pressable>

          {/* Sil butonu */}
          <Pressable
            onPress={() => removeTodo(item.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              pressed && styles.actionPressed,
            ]}
            accessibilityLabel="Sil"
          >
            <Text style={styles.actionTextDanger}>Sil</Text>
          </Pressable>
        </Pressable>
      );
    },
    [editingId, editingText, removeTodo, saveEditing, startEditing, toggleTodo]
  );

  // Ana render
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Başlık & sayaç */}
        <View style={styles.header}>
          <Text style={styles.title}>Görevler</Text>
          <Text style={styles.counter}>
            {totalCount} görev · {doneCount} tamamlandı
          </Text>
        </View>

        {/* Ekleme çubuğu */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Bir görev yazın…"
            placeholderTextColor="#9aa0a6"
            onSubmitEditing={addTodo}
            returnKeyType="done"
            style={styles.input}
            maxLength={120}
          />

          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={addTodo}
            accessibilityLabel="Görev ekle"
          >
            <Text style={styles.addBtnText}>Ekle</Text>
          </Pressable>
        </View>

        {/* Filtreler ve tamamlananları temizle */}
        <View style={styles.filters}>
          <FilterButton label="Tümü" active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
          <FilterButton
            label="Açık"
            active={filter === 'ACTIVE'}
            onPress={() => setFilter('ACTIVE')}
          />
          <FilterButton
            label="Tamamlanmış"
            active={filter === 'DONE'}
            onPress={() => setFilter('DONE')}
          />
          <Pressable
            onPress={clearCompleted}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            accessibilityLabel="Tamamlananları temizle"
          >
            <Text style={styles.clearBtnText}>Temizle</Text>
          </Pressable>
        </View>

        {/* Liste / Boş durum */}
        {filtered.length > 0 ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            extraData={{ editingId, editingText }}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Görev yok</Text>
            <Text style={styles.emptyText}>
              {filter === 'ALL'
                ? 'Hadi bir tane ekleyerek başlayalım.'
                : filter === 'ACTIVE'
                ? 'Aktif görev bulunmuyor.'
                : 'Tamamlanmış görev yok.'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Filtre butonu bileşeni
function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterBtn,
        active && styles.filterBtnActive,
        pressed && styles.filterBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}
// Stil tanımları
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b141a' },
  flex: { flex: 1 },

  // header Stil
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#22303a'
  },

  // Başlık ve sayaç
  title: { fontSize: 28, fontWeight: '700', color: '#e6edf3' },
  counter: { marginTop: 4, fontSize: 13, color: '#9aa0a6' },

  // Giriş çubuğu
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },

  // Giriş kutusu
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#22303a',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#e6edf3',
    fontSize: 16,
    backgroundColor: '#111b22',
    marginRight: 8
  },

  // Ekle butonu
  addBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Btn Pressed ve Text
  addBtnPressed: { opacity: 0.85 },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Filtre çubuğu
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8
  },

  // Filtre butonları
  filterBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#22303a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b141a',
    marginRight: 8
  },
  filterBtnActive: { backgroundColor: '#1f2937', borderColor: '#3b82f6' },
  filterBtnPressed: { opacity: 0.85 },
  filterText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#e6edf3' },

  // Tamamlananları temizle butonu
  clearBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#22303a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearBtnPressed: { opacity: 0.85 },
  clearBtnText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Liste satırı
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#0e1820'
  },
  rowPressed: { opacity: 0.9 },

  // Düzenleme modunda hafif vurgu
  rowEditing: {
    backgroundColor: '#0f2230',
    borderWidth: 1,
    borderColor: '#1f3a4a'
  },

  // Checkbox stilleri
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#0b141a'
  },

  // Tamamlanmış stil
  checkboxDone: { borderColor: '#10b981', backgroundColor: '#064e3b' },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#10b981'
  },

  // Görev metni
  todoText: { flex: 1, color: '#e6edf3', fontSize: 16 },
  todoTextDone: { color: '#9aa0a6', textDecorationLine: 'line-through' },

  // Düzenleme TextInput'u (satır içinde)
  editInput: {
    backgroundColor: '#111b22',
    borderWidth: 1,
    borderColor: '#22303a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8
  },

  // Sağdaki küçük işlem butonları
  actionBtn: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  actionPressed: { opacity: 0.85 },

  // Farklı işlem butonu renkleri
  editBtn: { borderColor: '#475569', backgroundColor: '#0b141a' },
  deleteBtn: { borderColor: '#7f1d1d', backgroundColor: '#200e0e' },
  saveBtn: { borderColor: '#14532d', backgroundColor: '#12321f' },
  cancelBtn: { borderColor: '#4b5563', backgroundColor: '#0b141a' },

  actionText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  actionTextStrong: { color: '#a7f3d0', fontSize: 12, fontWeight: '800' },
  actionTextDanger: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },

  separator: { height: 8 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyTitle: { color: '#e6edf3', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#9aa0a6', fontSize: 14, marginTop: 6 }
});
