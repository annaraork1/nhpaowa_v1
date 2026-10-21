import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../api';
import { colors, statusColor } from '../theme';

export default function ItemLookupScreen() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api.items.list();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.sku.toLowerCase().includes(term) ||
        i.category?.name?.toLowerCase().includes(term)
    );
  }, [items, q]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Item Lookup</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by name, SKU, category"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.sku} · {item.category?.name}
              </Text>
              <Text style={styles.meta}>
                Stock: {Number(item.currentStock)} {item.unit} (min{' '}
                {Number(item.minStockLevel)})
              </Text>
            </View>
            <Text style={[styles.badge, { color: statusColor(item.status) }]}>
              {String(item.status || '').replaceAll('_', ' ')}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No items match your search.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '700', maxWidth: 90, textAlign: 'right' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  error: { color: colors.danger, marginBottom: 8 },
});
