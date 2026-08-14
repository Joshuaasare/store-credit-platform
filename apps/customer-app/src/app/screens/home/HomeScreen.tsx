import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type {
  CustomerActivity,
  CustomerActivitiesApiResponse,
  CustomerCreditsApiResponse,
} from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import { useAuthStore } from "../../shared/store/useAuthStore";
import {
  customerActivitiesService,
  customerCreditsService,
} from "../../api/client";
import type { TabStackParamList } from "../../navigation/TabNavigator";
import ActivitiesModal from "./components/ActivitiesModal";
import { computeInitials } from "../../shared/utils/computeInitials";
import { deriveOffers } from "./deriveOffers";
import { useActivitiesFeed } from "./useActivitiesFeed";
import RecentActivitySection from "./components/RecentActivitySection";
import NearbyOffersSection from "./components/NearbyOffersSection";
import HeroBalanceCard from "./components/HeroBalanceCard";
import Header from "../../shared/components/Header";

const PREVIEW_ROWS = 4;

// Query keys — colocated so invalidation logic has a single source of truth.
const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const ACTIVITIES_PREVIEW_KEY = ["customer", "activities", "preview"] as const;

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation =
    useNavigation<BottomTabNavigationProp<TabStackParamList>>();

  const fullName = useMemo(
    () =>
      [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
      "Customer",
    [user?.surname, user?.other_names],
  );
  const initials = useMemo(() => computeInitials(fullName), [fullName]);

  // Hero balance — derived from the credits query (already cached). Sum the
  // `remaining` field on every credit row, not just live ones — the
  // customer sees their total wallet position at a glance.
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

  // Fade the preview section to 0 while the modal is open so the same
  // rows don't read as duplicated content above the sheet.
  const sectionOpacity = useSharedValue(1);
  useEffect(() => {
    sectionOpacity.value = withTiming(modalVisible ? 0 : 1, {
      duration: 180,
    });
  }, [modalVisible, sectionOpacity]);
  const sectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sectionOpacity.value,
  }));

  // Derive offers from the credits data — each live credit's branch +
  // merchant gives a real entry point. This beats placeholder copy.
  const offers = useMemo(
    () => deriveOffers(creditsQuery.data),
    [creditsQuery.data],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

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
      <ScreenBody>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* <GlassTransition> */}
        <View>
          <Header fullName={fullName} initials={initials} />
          <View style={styles.heroBlock}>
            <HeroBalanceCard
              totalRemaining={totalRemaining}
              storeCount={liveStoreCount}
              creditsLoading={creditsQuery.isLoading}
              onViewCredits={goToCredits}
            />
          </View>
        </View>

        <RecentActivitySection
          previewLoading={previewQuery.isLoading}
          previewError={previewQuery.error}
          previewItems={previewItems}
          onOpenActivitiesModal={openActivitiesModal}
          sectionAnimatedStyle={sectionAnimatedStyle}
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
  scrollContent: {
    paddingBottom: 96, // clears the floating tab bar
  },
  bottomSpacer: {
    height: 16,
  },

  heroBlock: {
    marginBottom: 24,
  },
});
