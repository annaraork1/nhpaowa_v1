import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../api';
import { colors } from '../theme';

export default function StockInScreen() {
  return <StockForm type="IN" title="Record Stock In" />;
}

function statusLabel(status) {
  return String(status || '').replaceAll('_', ' ');
}

export function StockForm({ type, title }) {
  const [allItems, setAllItems] = useState([]);
  const [attention, setAttention] = useState([]);
  const [itemId, setItemId] = useState('');
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [department, setDepartment] = useState('Maintenance Team');
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadCatalog() {
    const [items, attn] = await Promise.all([
      api.items.list({}),
      type === 'IN'
        ? Promise.all([
            api.items.list({ status: 'OUT_OF_STOCK' }),
            api.items.list({ status: 'LOW_STOCK' }),
          ]).then(([out, low]) => {
            const seen = new Set();
            return [...out, ...low].filter((i) => {
              if (seen.has(i.id)) return false;
              seen.add(i.id);
              return true;
            });
          })
        : api.items.list({ status: 'IN_STOCK' }),
    ]);
    setAllItems(items);
    setAttention(attn.slice(0, 12));
    if (!itemId && items[0]) setItemId(items[0].id);
  }

  async function loadRecent(forItemId) {
    if (!forItemId) {
      setRecent([]);
      return;
    }
    try {
      const rows = await api.stock.list({ itemId: forItemId, limit: 5 });
      setRecent(rows);
    } catch {
      setRecent([]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadCatalog();
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    loadRecent(itemId);
  }, [itemId]);

  const selected = useMemo(
    () => allItems.find((i) => i.id === itemId) || null,
    [allItems, itemId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      type === 'OUT'
        ? allItems.filter((i) => Number(i.currentStock) > 0)
        : allItems;
    if (!q) return base.slice(0, 40);
    return base
      .filter((i) => {
        const hay = [
          i.name,
          i.sku,
          i.barcode,
          i.category?.name,
          i.unit,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [allItems, query, type]);

  async function submit() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.stock.create({
        itemId,
        type,
        quantity: Number(quantity),
        referenceType: type === 'IN' ? 'MANUAL' : 'ISSUE',
        notes,
        department: type === 'OUT' ? department : null,
      });
      setMessage(`${type === 'IN' ? 'Stock In' : 'Stock Out'} recorded.`);
      setQuantity('1');
      setNotes('');
      await loadCatalog();
      await loadRecent(itemId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.section}>
        {type === 'IN' ? 'Needs replenishment' : 'Ready to issue'}
      </Text>
      <Text style={styles.hint}>
        {type === 'IN'
          ? 'Out of stock and low stock — tap to select.'
          : 'Healthy in-stock items — tap to select. Search for low-stock if needed.'}
      </Text>
      <View style={styles.chipWrap}>
        {attention.length ? (
          attention.map((i) => (
            <Pressable
              key={i.id}
              style={[styles.chip, itemId === i.id && styles.chipActive]}
              onPress={() => {
                setItemId(i.id);
                setQuery('');
              }}
            >
              <Text
                style={[styles.chipTitle, itemId === i.id && styles.chipTitleOn]}
                numberOfLines={1}
              >
                {i.name}
              </Text>
              <Text style={styles.chipMeta}>
                {Number(i.currentStock)} {i.unit} · {statusLabel(i.status)}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.hint}>
            {type === 'IN'
              ? 'Nothing below minimum.'
              : 'No healthy in-stock items — use search.'}
          </Text>
        )}
      </View>

      <Text style={styles.label}>Search item</Text>
      <TextInput
        style={styles.input}
        placeholder="Name, SKU, barcode…"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <Text style={styles.label}>Results</Text>
      <View style={styles.list}>
        {filtered.length ? (
          filtered.map((i) => {
            const active = i.id === itemId;
            return (
              <Pressable
                key={i.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setItemId(i.id)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleOn]}>
                  {i.name}
                </Text>
                <Text style={styles.optionMeta}>
                  {i.sku} · {Number(i.currentStock)} {i.unit} ·{' '}
                  {statusLabel(i.status)}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.hint}>No items match.</Text>
        )}
      </View>

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected.name}</Text>
          <Text style={styles.cardMeta}>
            On hand {Number(selected.currentStock)} {selected.unit} · min{' '}
            {Number(selected.minStockLevel)} · {statusLabel(selected.status)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      {type === 'OUT' ? (
        <>
          <Text style={styles.label}>Department / purpose</Text>
          <TextInput
            style={styles.input}
            value={department}
            onChangeText={setDepartment}
          />
        </>
      ) : null}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { minHeight: 70 }]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable
        style={[styles.btn, type === 'OUT' && styles.btnOut]}
        onPress={submit}
        disabled={saving || !itemId}
      >
        <Text style={styles.btnText}>
          {saving
            ? 'Saving…'
            : type === 'IN'
              ? 'Record Stock In'
              : 'Record Stock Out'}
        </Text>
      </Pressable>

      <Text style={[styles.section, { marginTop: 20 }]}>Last 5 transactions</Text>
      {recent.length ? (
        recent.map((t) => (
          <View key={t.id} style={styles.txnCard}>
            <View style={styles.txnRow}>
              <Text style={styles.txnType}>{t.type}</Text>
              <Text style={styles.txnWhen}>
                {new Date(t.transactionDate).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.txnLine}>
              Qty {t.type === 'OUT' ? '−' : '+'}
              {Number(t.quantity)} {selected?.unit || ''}
            </Text>
            <Text style={styles.txnLine}>
              Before {t.stockBefore ?? '—'} → After {t.stockAfter ?? '—'}
            </Text>
            <Text style={styles.txnMeta}>
              By {t.performedByName || '—'}
              {t.warehouse?.name ? ` · ${t.warehouse.name}` : ''}
              {t.notes ? ` · ${t.notes}` : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.hint}>No movements for this item yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.ink,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: colors.ink,
  },
  chipWrap: { marginBottom: 12, gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: '#eef6fb',
  },
  chipTitle: { fontWeight: '600', color: colors.ink },
  chipTitleOn: { color: colors.brand },
  chipMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    marginBottom: 12,
    maxHeight: 200,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  optionActive: { backgroundColor: '#eef6fb' },
  optionTitle: { color: colors.ink, fontWeight: '600' },
  optionTitleOn: { color: colors.brand },
  optionMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', color: colors.ink },
  cardMeta: { marginTop: 4, fontSize: 12, color: colors.muted },
  btn: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnOut: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger, marginBottom: 8 },
  ok: { color: colors.success, marginBottom: 8 },
  txnCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  txnType: { fontWeight: '700', color: colors.ink },
  txnWhen: { fontSize: 11, color: colors.muted },
  txnLine: { fontSize: 13, color: colors.ink, marginTop: 2 },
  txnMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
