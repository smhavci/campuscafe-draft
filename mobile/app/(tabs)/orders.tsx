import { FlatList, StyleSheet, View } from 'react-native';
import { EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useOrders } from '@/features/orders/orders.hooks';
import { OrderCard } from '@/features/orders/components/OrderCard';

export default function OrdersScreen() {
  const { data: orders, isLoading, refetch, isRefetching } = useOrders();

  return (
    <Screen edges={['top']}>
      <FlatList
        data={orders ?? []}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => (
          <View style={styles.wrap}>
            <OrderCard order={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={<Text variant="title" style={styles.title}>Siparişlerim</Text>}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="receipt-outline" title="Henüz siparişin yok" subtitle="İlk siparişini vererek başla." /> : null
        }
        contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: tokens.spacing.xl, paddingVertical: tokens.spacing.md },
  wrap: { paddingHorizontal: tokens.spacing.xl, marginBottom: tokens.spacing.md },
});
