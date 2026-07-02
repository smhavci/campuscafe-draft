import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, Text, TopTabs } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { ActiveOrdersTab } from '@/features/dashboard/components/ActiveOrdersTab';
import { HistoryTab } from '@/features/dashboard/components/HistoryTab';
import { AnalyticsTab } from '@/features/dashboard/components/AnalyticsTab';

type Tab = 'active' | 'history' | 'analytics';

export default function PanelScreen() {
  const [tab, setTab] = useState<Tab>('active');
  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Text variant="title">Panel</Text>
        <TopTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Aktif', value: 'active' },
            { label: 'Geçmiş', value: 'history' },
            { label: 'Analiz', value: 'analytics' },
          ]}
        />
      </View>
      {tab === 'active' ? <ActiveOrdersTab /> : tab === 'history' ? <HistoryTab /> : <AnalyticsTab />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { padding: tokens.spacing.xl, gap: tokens.spacing.md },
});
