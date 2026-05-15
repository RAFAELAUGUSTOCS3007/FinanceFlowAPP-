import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Home, TrendingDown, List, TrendingUp, Target } from 'lucide-react-native';

const NEON = '#AAFF00';
const TAB_BG = '#13131A';
const TAB_ICON_INACTIVE = '#6060A0';
const BORDER = 'rgba(170,255,0,0.08)';

function TabIcon({ Icon, focused }: { Icon: any; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 0 }}>
      <Icon
        size={22}
        color={focused ? NEON : TAB_ICON_INACTIVE}
        strokeWidth={focused ? 2.2 : 1.8}
      />
      {focused && (
        <View style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: NEON, marginTop: 3,
        }} />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: NEON,
        tabBarInactiveTintColor: TAB_ICON_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Despesas',
          tabBarIcon: ({ focused }) => <TabIcon Icon={TrendingDown} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="fixed"
        options={{
          title: 'Fixas',
          tabBarIcon: ({ focused }) => <TabIcon Icon={List} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Entradas',
          tabBarIcon: ({ focused }) => <TabIcon Icon={TrendingUp} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Target} focused={focused} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
