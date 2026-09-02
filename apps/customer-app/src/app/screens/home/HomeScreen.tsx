import { useCallback, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import type {
  CustomerActivity,
  CustomerActivitiesApiResponse,
  CustomerCreditsApiResponse,
} from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import {
  customerActivitiesService,
  customerCreditsService,
} from "../../api/client";
import type { TabStackParamList } from "../../navigation/TabNavigator";
import ActivitiesModal from "./components/ActivitiesModal";
import { deriveOffers } from "./deriveOffers";
import { useActivitiesFeed } from "./useActivitiesFeed";
import RecentActivitySection from "./components/RecentActivitySection";
import NearbyOffersSection from "./components/NearbyOffersSection";
import HeroBalanceCard from "./components/HeroBalanceCard";
import { useOffsets } from "../../shared/hooks/useOffsets";
import DiscountPattern from "../../shared/components/DiscountPattern";

const PREVIEW_ROWS = 4;

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const ACTIVITIES_PREVIEW_KEY = ["customer", "activities", "preview"] as const;

export function HomeScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<TabStackParamList>>();
  const { tabBarOffset } = useOffsets();

  // Sum remaining on every credit row, not just live — total wallet position at a glance.
  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });
  const totalRemaining = useMemo(() => {
    if (!creditsQuery.data?.success) return 0;
    const all = [
      ...creditsQuery.data.data.live,
      ...creditsQuery.data.data.expired,
    ];
    return all.reduce((sum, c) => sum + (Number(c.remaining) || 0), 0);
  }, [creditsQuery.data]);

  const liveStoreCount = useMemo(() => {
    if (!creditsQuery.data?.success) return 0;
    const branches = new Set<string>();
    for (const c of creditsQuery.data.data.live) {
      if (c.branch_id != null) branches.add(String(c.branch_id));
    }
    return branches.size;
  }, [creditsQuery.data]);

  const previewQuery = useQuery<CustomerActivitiesApiResponse>({
    queryKey: ACTIVITIES_PREVIEW_KEY,
    queryFn: () => customerActivitiesService.list({ limit: PREVIEW_ROWS }),
  });
  const feedQuery = useActivitiesFeed();

  const previewItems = useMemo<CustomerActivity[]>(() => {
    if (!previewQuery.data?.success) return [];
    return previewQuery.data.data.items;
  }, [previewQuery.data]);

  const [modalVisible, setModalVisible] = useState(false);

  const offers = useMemo(
    () => deriveOffers(creditsQuery.data),
    [creditsQuery.data],
  );

  const goToCredits = useCallback(() => {
    navigation.navigate("Credits");
  }, [navigation]);

  const openActivitiesModal = useCallback(() => {
    setModalVisible(true);
  }, []);
  const closeActivitiesModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <ScreenBackground>
      <DiscountPattern />
      <PageHeader unreadNotifications={5} />
      <ScreenBody edges={["bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{
            paddingTop: 24,
          }}
          contentContainerStyle={{
            ...styles.scrollContent,
            paddingBottom: tabBarOffset,
          }}
        >
          {/* <GlassTransition> */}
          <View style={styles.heroBlock}>
            <HeroBalanceCard
              totalRemaining={totalRemaining}
              storeCount={liveStoreCount}
              creditsLoading={creditsQuery.isLoading}
              onViewCredits={goToCredits}
            />
          </View>

          <RecentActivitySection
            previewLoading={previewQuery.isLoading}
            previewError={previewQuery.error}
            previewItems={previewItems}
            onOpenActivitiesModal={openActivitiesModal}
          />

          {offers.length > 0 ? <NearbyOffersSection offers={offers} /> : null}
          {/* </GlassTransition> */}
          <ActivitiesModal
            visible={modalVisible}
            onClose={closeActivitiesModal}
            feedQuery={feedQuery}
            previewItemCount={previewItems.length}
          />
        </ScrollView>
      </ScreenBody>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Floating tab bar clearance. The bar is 64 tall + 16 gap = 80 from the
  // screen bottom (Android: + insets.bottom since it lifts above the system
  // nav bar). ScreenBody's edges:["bottom"] already reserves 24 + insets.bottom,
  // so on Android the ScrollView needs 56 more to reach the bar's top edge.
  // iOS keeps its original layout — ScreenBody's bottom inset covers the 16px
  // floating gap, no extra scroll padding. Platform-specific per the RN skill.
  scrollContent: {},

  heroBlock: {
    marginBottom: 24,
  },
});
