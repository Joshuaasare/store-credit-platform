import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ExploreBranch } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { customerExploreService } from "../../api/client";
import { useOffsets } from "../../shared/hooks/useOffsets";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import LocationModal from "./components/LocationModal";
import SearchModal from "./components/SearchModal";
import BranchCard from "./components/BranchCard";

const EXPLORE_BRANCHES_QUERY_KEY = ["customer", "exploreBranches"] as const;

export function ExploreScreen() {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const { tabBarOffset } = useOffsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const hasLocation =
    user?.latitude != null && user?.longitude != null;

  const branchesQuery = useQuery({
    queryKey: EXPLORE_BRANCHES_QUERY_KEY,
    queryFn: () => customerExploreService.getExploreBranches(),
    enabled: hasLocation,
  });

  const branches: ExploreBranch[] =
    branchesQuery.data?.success ? branchesQuery.data.data : [];

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: tabBarOffset,
          }}
        >
          <Pressable
            onPress={() => setSearchOpen(true)}
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: theme.radii.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search merchants"
          >
            <Ionicons name="search" size={16} color={theme.colors.textMuted} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 14,
                marginLeft: 8,
              }}
            >
              Search merchants
            </Text>
          </Pressable>

          {!hasLocation ? (
            <SetLocationCta onPress={() => setLocationOpen(true)} />
          ) : branchesQuery.isLoading ? (
            <LoadingState />
          ) : branches.length === 0 ? (
            <EmptyBranchesState />
          ) : (
            <FlatList
              data={branches}
              keyExtractor={(b) => `${b.branch.id}`}
              renderItem={({ item }) => <BranchCard branch={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
              contentContainerStyle={{ paddingTop: 16 }}
            />
          )}
        </ScrollView>

        <SearchModal
          visible={searchOpen}
          onDismiss={() => setSearchOpen(false)}
        />
        <LocationModal
          visible={locationOpen}
          onDismiss={() => setLocationOpen(false)}
        />
      </ScreenBody>
    </ScreenBackground>
  );
}

function SetLocationCta({ onPress }: { onPress: () => void }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <Ionicons name="navigate" size={32} color={theme.colors.primary} />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 16,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Set your location to see nearby branches
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        We'll show branches near you with their active offers.
      </Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.ctaButton,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Set your location"
      >
        <Text
          style={{
            color: theme.colors.textOnPrimary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 15,
          }}
        >
          Set location
        </Text>
      </Pressable>
    </View>
  );
}

function LoadingState() {
  const theme = useThemeTokens();
  return (
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
        Loading nearby branches…
      </Text>
    </View>
  );
}

function EmptyBranchesState() {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <Ionicons name="storefront-outline" size={32} color={theme.colors.textMuted} />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 16,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        No branches near you yet
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Try a different location — merchants in your area may not have
        active offers right now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
  },
  ctaButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});
