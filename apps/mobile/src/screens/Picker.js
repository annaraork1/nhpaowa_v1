import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Lightweight picker that works without @react-native-picker/picker native module. */
export function Picker({ selectedValue, onValueChange, items }) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = item.value === selectedValue;
        return (
          <Text
            key={item.value}
            onPress={() => onValueChange(item.value)}
            style={[styles.option, active && styles.active]}
          >
            {item.label}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    marginBottom: 12,
    maxHeight: 180,
    overflow: 'scroll',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.ink,
  },
  active: {
    backgroundColor: '#eff6ff',
    fontWeight: '700',
    color: colors.brand,
  },
});
