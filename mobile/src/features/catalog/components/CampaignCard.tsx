import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import type { Campaign } from '@/shared/types/api';

export function CampaignCard({ campaign, color }: { campaign: Campaign; color: string }) {
  return (
    <View style={[styles.card, { backgroundColor: color }]}>
      {campaign.discount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{campaign.discount}</Text>
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
      <Text style={styles.desc} numberOfLines={2}>{campaign.description}</Text>
      {campaign.cafeName ? <Text style={styles.cafe}>{campaign.cafeName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, justifyContent: 'space-between', minHeight: 150 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: tokens.radius.pill },
  badgeTxt: { color: '#fff', fontWeight: '800' },
  title: { color: '#fff', fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xl, fontWeight: '700', marginTop: tokens.spacing.sm },
  desc: { color: '#fff', opacity: 0.9, fontSize: tokens.fontSize.sm, marginTop: 4 },
  cafe: { color: '#fff', opacity: 0.8, fontSize: tokens.fontSize.sm, marginTop: tokens.spacing.sm, fontWeight: '600' },
});
