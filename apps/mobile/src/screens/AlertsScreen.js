import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api';
import { colors } from '../theme';

function relativeTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setAlerts(await api.alerts.list(false));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <View style={[styles.card, item.isRead && { opacity: 0.65 }]}>
            <Text style={styles.type}>{String(item.type).replaceAll('_', ' ')}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.row}>
              <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
              {!item.isRead ? (
                <Pressable
                  onPress={async () => {
                    await api.alerts.markRead(item.id);
                    load();
                  }}
                >
                  <Text style={styles.link}>Mark read</Text>
                </Pressable>
              ) : (
                <Text style={styles.time}>Read</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No alerts yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: colors.ink },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  type: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  message: { marginTop: 6, fontSize: 14, color: colors.ink },
  row: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 12, color: colors.muted },
  link: { fontSize: 12, fontWeight: '700', color: colors.brand },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  error: { color: colors.danger, marginBottom: 8 },
});
