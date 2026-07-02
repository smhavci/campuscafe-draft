import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, StarBadge, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { greeting } from '@/shared/utils/time';
import { useMe } from '@/features/auth/auth.hooks';
import { useCafes, useCampaigns } from '@/features/catalog/catalog.hooks';
import { CafeCard } from '@/features/catalog/components/CafeCard';
import { CampaignCard } from '@/features/catalog/components/CampaignCard';

const ACCENTS = [tokens.color.primary, tokens.color.terracotta, tokens.color.sage, tokens.color.primaryDark];

export default function HomeScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: cafes, refetch, isRefetching } = useCafes();
  const { data: campaigns } = useCampaigns();

  return (
    <Screen edges={['top']}>
      <FlatList
        data={cafes ?? []}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => (
          <View style={styles.cafeWrap}>
            <CafeCard cafe={item} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xl }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text variant="muted">{greeting()} 👋</Text>
                <Text variant="title">{me?.firstName ?? ''} {me?.lastName ?? ''}</Text>
              </View>
              <View style={styles.headerRight}>
                <StarBadge count={me?.stars ?? 0} />
                <Pressable style={styles.bell} onPress={() => {}}>
                  <Ionicons name="notifications-outline" size={22} color={tokens.color.text} />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.search} onPress={() => router.push('/explore')}>
              <Ionicons name="search" size={20} color={tokens.color.primaryDark} />
              <Text variant="muted">Ürün veya kafe ara…</Text>
            </Pressable>

            {campaigns && campaigns.length > 0 ? (
              <View style={styles.section}>
                <Text variant="heading" style={styles.sectionTitle}>Kampanyalar</Text>
                <FlatList
                  horizontal
                  data={campaigns}
                  keyExtractor={(c) => String(c.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hList}
                  renderItem={({ item, index }) => (
                    <CampaignCard campaign={item} color={ACCENTS[index % ACCENTS.length]} />
                  )}
                />
              </View>
            ) : null}

            <Text variant="heading" style={styles.kafelerTitle}>Kafeler</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: tokens.spacing.xl, paddingTop: tokens.spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.color.surface,
    marginHorizontal: tokens.spacing.xl,
    marginTop: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    height: 52,
    borderRadius: tokens.radius.pill,
    ...tokens.shadow.card,
  },
  section: { marginTop: tokens.spacing.xl },
  sectionTitle: { paddingHorizontal: tokens.spacing.xl, marginBottom: tokens.spacing.md },
  hList: { paddingHorizontal: tokens.spacing.xl, gap: tokens.spacing.md },
  kafelerTitle: { paddingHorizontal: tokens.spacing.xl, marginTop: tokens.spacing.xl, marginBottom: tokens.spacing.md },
  cafeWrap: { paddingHorizontal: tokens.spacing.xl, marginBottom: tokens.spacing.md },
});
