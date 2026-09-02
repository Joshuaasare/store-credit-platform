import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import type { BranchWithOffers } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import { customerOfferService } from "../../api/client";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { cashbackHeadline } from "../../shared/utils/configDisplay";
import { formatDistance } from "../../shared/utils/travel.utils";
import type { AppStackParamList } from "../../navigation/RootNavigator";

export function OfferBranchesScreen() {
  const theme = useThemeTokens();
  const route = useRoute<RouteProp<AppStackParamList, "OfferBranches">>();
  const { config_type, config_id } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const user = useAuthStore((s) => s.user);

  const branchesQuery = useQuery({
    queryKey: ["customer", "offerBranches", config_type, config_id],
    queryFn: async () => {
      const res = await customerOfferService.getOfferBranches({
        configType: config_type,
        configId: config_id,
        lat: user?.latitude ?? null,
        lng: user?.longitude ?? null,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const headline = useMemo(() => {
    const config = branchesQuery.data?.config;
    if (!config) return "";
    if (config_type === "fixed" && "title" in config) {
      return config.title?.trim() || "Discount offer";
    }
    if (config_type === "running" && "credit_type" in config) {
      return cashbackHeadline(config);
    }
    return "";
  }, [branchesQuery.data, config_type]);

  const openBranch = useCallback(
    (branch: BranchWithOffers) => {
      navigation.navigate("BranchOffersDetail", { branch });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: BranchWithOffers }) => (
      <BranchRow branch={item} onPress={() => openBranch(item)} />
    ),
    [openBranch],
  );

  const ItemSeparator = useCallback(
    () => (
      <View
        style={[
          styles.separator,
          { backgroundColor: theme.colors.surfaceBorder },
        ]}
      />
    ),
    [theme],
  );

  const ListEmpty = useCallback(() => {
    if (branchesQuery.isLoading || !branchesQuery.isSuccess) return null;
    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIconWrap,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <Ionicons
            name="storefront-outline"
            size={32}
            color={theme.colors.textMuted}
          />
        </View>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyMedium,
            fontSize: 15,
            marginTop: 12,
          }}
        >
          No branches offering this deal
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Check back later — merchants rotate their offers.
        </Text>
      </View>
    );
  }, [branchesQuery.isLoading, branchesQuery.isSuccess, theme]);

  const branches = branchesQuery.data?.branches ?? [];

  return (
    <ScreenBackground>
      <PageHeader backLabel="Back" onBackPress={() => navigation.goBack()} />
      <ScreenBody edges={["bottom"]}>
        {branchesQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 13,
                marginTop: 12,
              }}
            >
              Loading branches…
            </Text>
          </View>
        ) : (
          <>
            {headline ? (
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 18,
                  letterSpacing: 0.1,
                  paddingHorizontal: 4,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {headline}
              </Text>
            ) : null}
            <FlatList
              data={branches}
              keyExtractor={(b) => `branch-${b.id}`}
              renderItem={renderItem}
              ItemSeparatorComponent={ItemSeparator}
              ListEmptyComponent={ListEmpty}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </>
        )}
      </ScreenBody>
    </ScreenBackground>
  );
}

function BranchRow({
  branch,
  onPress,
}: {
  branch: BranchWithOffers;
  onPress: () => void;
}) {
  const theme = useThemeTokens();
  const merchantName = branch.merchant?.name ?? "Merchant";
  const branchName = branch.name ?? branch.city ?? "Branch";
  const placeText = branch.place_label ?? branch.city ?? null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <MerchantAvatar
          merchantName={merchantName}
          logoUrl={branch.merchant?.logo_url ?? null}
          idSeed={branch.merchant?.id}
          size={32}
        />
      </View>
      <View style={styles.center}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 14,
            letterSpacing: 0.1,
          }}
        >
          {merchantName}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {placeText && placeText !== branchName
            ? `${branchName} • ${placeText}`
            : branchName}
        </Text>
      </View>
      {branch.distance_km != null ? (
        <View
          style={[
            styles.distanceChip,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <Ionicons
            name="location-outline"
            size={12}
            color={theme.colors.textMuted}
          />
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 12,
              marginLeft: 3,
            }}
          >
            {formatDistance(branch.distance_km)}
          </Text>
        </View>
      ) : null}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 8,
  },
  ring: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  separator: {
    height: 1,
    marginHorizontal: 7,
  },
  distanceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  empty: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});