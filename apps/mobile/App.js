import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import ItemLookupScreen from './src/screens/ItemLookupScreen';
import StockInScreen from './src/screens/StockInScreen';
import StockOutScreen from './src/screens/StockOutScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import { setRole, getRole, API_BASE } from './src/api';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const ROLES = ['STAFF', 'SECRETARY', 'TREASURER'];

function TabLabel({ label, color }) {
  return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>;
}

export default function App() {
  const [role, setRoleState] = useState(getRole());

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <View
        style={{
          backgroundColor: colors.sidebar,
          paddingHorizontal: 12,
          paddingBottom: 8,
          paddingTop: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>NHPAOWA Inventory</Text>
        <Text style={{ color: '#8da4c0', fontSize: 11 }} numberOfLines={1}>
          {API_BASE}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {ROLES.map((r) => (
            <Pressable
              key={r}
              onPress={() => {
                setRole(r);
                setRoleState(r);
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: role === r ? colors.brand : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarStyle: { paddingTop: 4, height: 60 },
        }}
      >
        <Tab.Screen
          name="Lookup"
          component={ItemLookupScreen}
          options={{
            tabBarLabel: ({ color }) => <TabLabel label="Lookup" color={color} />,
          }}
        />
        <Tab.Screen
          name="StockIn"
          component={StockInScreen}
          options={{
            tabBarLabel: ({ color }) => <TabLabel label="Stock In" color={color} />,
          }}
        />
        <Tab.Screen
          name="StockOut"
          component={StockOutScreen}
          options={{
            tabBarLabel: ({ color }) => <TabLabel label="Stock Out" color={color} />,
          }}
        />
        <Tab.Screen
          name="Alerts"
          component={AlertsScreen}
          options={{
            tabBarLabel: ({ color }) => <TabLabel label="Alerts" color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
