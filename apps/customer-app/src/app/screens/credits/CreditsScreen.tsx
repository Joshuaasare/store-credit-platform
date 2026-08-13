import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type {
  CustomerCreditWithBranch,
  CustomerCreditsApiResponse,
} from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import GlassTransition from "../../shared/components/GlassTransition";
import GlassSegmentedControl from "../../shared/components/GlassSegmentedControl";
import CreditCard from "./components/CreditCard";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import LoadingState from "./components/LoadingState";
import { useThemeTokens } from "../../theme/ThemeContext";
import { customerCreditsService } from "../../api/client";

type CreditsTab = "live" | "expired";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;

/**
 * Credits screen — the customer's money view of their store credit. Two
 * in-screen tabs ("Live credits" / "Expired credits") sit on top of a single
 * `useQuery` against `/customers/me/credits`; the backend returns both
 * buckets in one response so switching tabs is instant (no network hop).
 *
 * The whole screen is wrapped in `<GlassTransition>` so the existing
 * cross-fade still plays when the user focuses the Credits tab in the
 * bottom navigator.
 */
export function CreditsScreen() {
  const theme = useThemeTokens();
  const [tab, setTab] = useState<CreditsTab>("live");

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const live = query.data?.success ? query.data.data.live : [];
  const expired = query.data?.success ? query.data.data.expired : [];
  const list: CustomerCreditWithBranch[] = tab === "live" ? live : expired;

  return (
    <ScreenBackground>
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

          <GlassSegmentedControl<CreditsTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "live", label: "Live credits", badge: live.length },
              { value: "expired", label: "Expired", badge: expired.length },
            ]}
            accessibilityLabel="Credits view"
            style={styles.segmentedControl}
          />

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
            ) : list.length === 0 ? (
              tab === "live" ? (
                <EmptyState
                  title="No live credits yet"
                  subtitle="Visit a merchant to start earning credit on your purchases."
                />
              ) : (
                <EmptyState
                  title="No expired credits"
                  subtitle="Credits that expire or get revoked will show up here."
                />
              )
            ) : (
              <FlatList
                data={list}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item, index }) => (
                  <CreditCard
                    credit={item}
                    style={index === 0 ? undefined : { marginTop: 12 }}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </GlassTransition>
    </ScreenBackground>
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
  segmentedControl: {
    marginBottom: 16,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
});
