// index.tsx
/*
• Todo List Uygulaması
• Firebase yoktur
• İsteğe bağlı kalıcılık (AsyncStorage) için en altta yorumlu şablon var.
*/

// React temel bileşen ve React Native bileşenleri içe aktarılıyor
import { useCallback, useMemo, useState } from 'react';

import { Pressable, Text, TextInput, View } from 'react-native';

// React Native bileşenleri içe aktarılıyor.

// Tek bir görev öğesi bileşeni
export type Todo = {
  id: string;
  text: string;
  done: boolean;
}; //end Todo

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
    if (!text) return; // Boşsa çık

    //Metin tekrarını engele (Büyük küçük harfe duyarlı)
    const exists = todos.some(
      (t) => t.text.toLocaleLowerCase('tr-TR') === text.toLocaleLowerCase('tr-TR')
    );

    // Aynı görev zaten mevcutsa uyarı ver ve çık
    if (exists) {
      alert('Aynı görev zaten mevcut!');
      setInput('');
      return;
    }

    // Yeni görev oluştur ve listeye ekle
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
    if (duplicate) return;

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

  const totalCount = todos.length;
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
        <Pressable
          onPress={() => toggleTodo(item.id)}
          onLongPress={() => removeTodo(item.id)}
          android_ripple={{ color: '#00000014' }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Görev: ${item.text}`}
          accessibilityHint="Dokunarak tamamla/geri al; uzun basarak sil"
        >
          <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
            {item.done ? <View style={styles.checkboxInner} /> : null}
          </View>

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
} // end of addTodo
