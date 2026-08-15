import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import GlassTransition from "../../shared/components/GlassTransition";
import CreditCard from "./components/CreditCard";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import LoadingState from "./components/LoadingState";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { customerCreditsService } from "../../api/client";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "./lib/aggregateCredits";
import type { AppStackParamList } from "../../navigation/RootNavigator";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;

/**
 * Credits screen — the customer's money view of their store credit.
 *
 * The screen shows ONLY live credits (expired/redeemed credits never
 * reappear on this surface). Live credits are aggregated by merchant —
 * one card per merchant, total = sum of `remaining` across every branch
 * the customer has a live credit at. Tapping a card opens the per-merchant
 * detail screen.
 *
 * Backend: single `/customers/me/credits` call returns `live` + `expired`;
 * only `live` is read.
 */
export function CreditsScreen() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const buckets = aggregateLiveByMerchant(
    query.data?.success ? query.data.data.live : [],
  );

  return (
    <ScreenBackground>
      <ScreenBody>
      <GlassTransition>
        <View style={styles.container}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyBold,
              },
            ]}
          >
            Credits
          </Text>

          <View style={styles.listArea}>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState
                message={
                  query.error instanceof Error
                    ? query.error.message
                    : "Couldn't load your credits."
                }
              />
            ) : buckets.length === 0 ? (
              <EmptyState
                title="No live credits yet"
                subtitle="Visit a merchant to start earning credit on your purchases."
              />
            ) : (
              <FlatList
                data={buckets}
                keyExtractor={(item) => String(item.merchantId)}
                renderItem={({ item, index }) => (
                  <MerchantCreditRow
                    bucket={item}
                    isFirst={index === 0}
                    onPress={() =>
                      navigation.navigate("CreditsMerchantDetail", {
                        merchantId: item.merchantId,
                      })
                    }
                    onRedeem={() =>
                      navigation.navigate("CreditsMerchantDetail", {
                        merchantId: item.merchantId,
                        autoOpenRedemption: true,
                      })
                    }
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </GlassTransition>
      </ScreenBody>
    </ScreenBackground>
  );
}

/**
 * Single tappable row — wraps `CreditCard` in a `Pressable` so the entire
 * card surface is the touch target (opens the merchant detail screen).
 * The card's own `Redeem` button consumes taps on its pill, so the
 * `Pressable` only fires for taps elsewhere on the card surface.
 */
function MerchantCreditRow({
  bucket,
  isFirst,
  onPress,
  onRedeem,
}: {
  bucket: MerchantCreditBucket;
  isFirst: boolean;
  onPress: () => void;
  onRedeem: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? undefined : styles.rowSpacing,
        pressed ? styles.rowPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${bucket.merchantName} credits`}
    >
      <CreditCard bucket={bucket} onRedeem={onRedeem} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    borderRadius: 20,
  },
  rowSpacing: {
    marginTop: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
