import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type {
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
} from "@store-credit-platform/api-services";
import { customerConfigInteractionService } from "../../api/client";
import ScreenBackground from "../../shared/components/ScreenBackground";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import { ImageLightbox } from "../../shared/components/ImageLightbox";
import MerchantTabSwitcher from "../credits/components/MerchantTabSwitcher";
import VisitLinkButton from "../../shared/components/VisitLinkButton";
import { useCustomerFavorites } from "../../shared/hooks/useCustomerFavorites";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import {
  cashbackHeadline,
  cashbackMeta,
  formatFixedDateRange,
} from "../../shared/utils/configDisplay";
import { formatGhs } from "../../shared/utils/formatGhs";
import {
  DRIVE_KMH,
  WALK_KMH,
  formatDistance,
  formatTravel,
  travelMinutes,
} from "../../shared/utils/travel.utils";
import type { AppStackParamList } from "../../navigation/RootNavigator";

type OfferTab = "discounts" | "cashback";

export function BranchOffersDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, "BranchOffersDetail">>();
  const branch = route.params.branch;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const favorites = useCustomerFavorites();

  const merchantName = branch.merchant?.name ?? "Merchant";
  const logoUrl = branch.merchant?.logo_url ?? null;
  const branchName = branch.name ?? branch.city ?? "Branch";
  const placeText = branch.place_label ?? branch.city ?? null;

  // Fire-and-forget: a visit-link tap bumps the campaign's click tally; a
  // failed call is silently dropped since the link itself already opened.
  const recordVisit = (configType: "running" | "fixed", configId: number) => {
    void customerConfigInteractionService
      .recordClick({ configType, configId })
      .catch(() => {
        // do nothing
      });
  };

  const discountOffers = useMemo(
    () => branch.fixed_configs ?? [],
    [branch.fixed_configs],
  );
  const cashbackConfigs = useMemo(
    () => branch.running_configs ?? [],
    [branch.running_configs],
  );

  // Discounts first by default; fall back to cashback if there are none.
  const [tab, setTab] = useState<OfferTab>(() =>
    discountOffers.length > 0 ? "discounts" : "cashback",
  );

  const walkMin = travelMinutes(branch.distance_km, WALK_KMH);
  const driveMin = travelMinutes(branch.distance_km, DRIVE_KMH);
  const entryThreshold = branch.purchase_threshold_amount ?? null;

  const hasCoords = branch.latitude != null && branch.longitude != null;
  const openInMaps = () => {
    if (!hasCoords) return;
    // Universal Google Maps URL — opens the native app on Android, the GM app
    // or web on iOS. No API key needed for a search-by-coords link.
    const url = `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
    void Linking.openURL(url);
  };

  const [viewer, setViewer] = useState<{
    images: string[];
    start: number;
  } | null>(null);
  const openViewer = (images: string[] | null, index: number) => {
    if (!images || images.length === 0) return;
    setViewer({ images, start: Math.min(index, images.length - 1) });
  };

  const tabOptions = useMemo<{ value: OfferTab; label: string }[]>(
    () => [
      { value: "discounts", label: "Discounts" },
      { value: "cashback", label: "Cashback" },
    ],
    [],
  );

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <SafeAreaView
          edges={["top"]}
          style={[styles.header, { backgroundColor: theme.colors.primary }]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackRow}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.textOnPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTopRow}>
            <MerchantAvatar
              merchantName={merchantName}
              logoUrl={logoUrl}
              size={52}
              style={{ marginRight: 12 }}
            />
            <View style={styles.headerText}>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 18,
                  letterSpacing: -0.2,
                }}
              >
                {merchantName}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  opacity: 0.78,
                  marginTop: 2,
                }}
              >
                {placeText && placeText !== branchName
                  ? `${branchName} • ${placeText}`
                  : branchName}
              </Text>
            </View>
          </View>

          <View style={styles.travelRow}>
            <Ionicons
              name="walk"
              size={13}
              color={theme.colors.textOnPrimary}
            />
            <Text
              style={{
                color: theme.colors.textOnPrimary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {walkMin != null ? formatTravel(walkMin) : "—"}
            </Text>
            <View
              style={[
                styles.travelDot,
                { backgroundColor: theme.colors.textOnPrimary, opacity: 0.45 },
              ]}
            />
            <Ionicons name="car" size={13} color={theme.colors.textOnPrimary} />
            <Text
              style={{
                color: theme.colors.textOnPrimary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {driveMin != null ? formatTravel(driveMin) : "—"}
            </Text>
            {branch.distance_km != null ? (
              <Text
                style={{
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 12,
                  opacity: 0.7,
                  marginLeft: 6,
                }}
              >
                · {formatDistance(branch.distance_km)}
              </Text>
            ) : null}
            {hasCoords ? (
              <TouchableOpacity
                onPress={openInMaps}
                accessibilityRole="button"
                accessibilityLabel="Open branch location in Google Maps"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.directionsPill,
                  {
                    borderRadius: theme.radii.pill,
                    borderColor: theme.colors.textOnPrimary,
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={12}
                  color={theme.colors.textOnPrimary}
                />
                <Text
                  style={{
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 11,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Directions
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {entryThreshold != null ? (
            <View style={styles.entryRow}>
              <Ionicons
                name="pricetag-outline"
                size={12}
                color={theme.colors.textOnPrimary}
              />
              <Text
                style={{
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 11.5,
                  opacity: 0.92,
                  marginLeft: 4,
                }}
              >
                Eligible on purchases ≥ {formatGhs(entryThreshold)}
              </Text>
            </View>
          ) : null}
        </SafeAreaView>

        <View style={styles.tabWrap}>
          <MerchantTabSwitcher
            options={tabOptions}
            value={tab}
            onChange={setTab}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {tab === "discounts" ? (
            discountOffers.length > 0 ? (
              <View style={styles.list}>
                {discountOffers.map((c) => (
                  <DiscountOfferCard
                    key={`fixed-${c.id}`}
                    config={c}
                    onImagePress={(i) => openViewer(c.images, i)}
                    onVisit={() => recordVisit("fixed", c.id)}
                    favorited={favorites.isFavorited("fixed", c.id)}
                    favoriteCount={favorites.countFor(
                      "fixed",
                      c.id,
                      c.favorite_count,
                    )}
                    pending={favorites.pendingFor("fixed", c.id)}
                    onToggleFavorite={() =>
                      favorites.toggleFavorite("fixed", c.id)
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyTabState
                icon="pricetags-outline"
                text="No discount offers at this branch right now"
              />
            )
          ) : cashbackConfigs.length > 0 ? (
            <View style={styles.list}>
              {cashbackConfigs.map((c) => (
                <CashbackConfigCard
                  key={`running-${c.id}`}
                  config={c}
                  onImagePress={(i) => openViewer(c.images, i)}
                  onVisit={() => recordVisit("running", c.id)}
                  favorited={favorites.isFavorited("running", c.id)}
                  favoriteCount={favorites.countFor(
                    "running",
                    c.id,
                    c.favorite_count,
                  )}
                  pending={favorites.pendingFor("running", c.id)}
                  onToggleFavorite={() =>
                    favorites.toggleFavorite("running", c.id)
                  }
                />
              ))}
            </View>
          ) : (
            <EmptyTabState
              icon="cash-outline"
              text="No cashback configs at this branch right now"
            />
          )}
        </ScrollView>
      </View>

      <ImageLightbox
        images={viewer?.images ?? []}
        visible={viewer != null}
        startIndex={viewer?.start ?? 0}
        onDismiss={() => setViewer(null)}
      />
    </ScreenBackground>
  );
}

function DiscountOfferCard({
  config,
  onImagePress,
  onVisit,
  favorited,
  favoriteCount,
  pending,
  onToggleFavorite,
}: {
  config: BaseFixedCreditConfig & { favorite_count: number };
  onImagePress: (index: number) => void;
  onVisit: () => void;
  favorited: boolean;
  favoriteCount: number;
  pending: boolean;
  onToggleFavorite: () => void;
}) {
  const theme = useThemeTokens();
  const title = config.title ?? "Discount offer";
  const dateRange = formatFixedDateRange(config.start_date, config.end_date);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={styles.cardTitleRow}>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 17,
            lineHeight: 22,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>

        <View style={styles.favGroup}>
          {favoriteCount > 0 ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyMedium,
                fontSize: 12,
                marginRight: 4,
              }}
            >
              {favoriteCount}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={onToggleFavorite}
            disabled={pending}
            accessibilityRole="button"
            accessibilityState={{ selected: favorited }}
            accessibilityLabel={
              favorited ? "Remove from favorites" : "Add to favorites"
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.heartButton}
          >
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={22}
              color={favorited ? theme.colors.error : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {dateRange ? (
        <View style={styles.metaRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={theme.colors.textMuted}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
            }}
          >
            {dateRange}
          </Text>
        </View>
      ) : null}

      {(config.description != null || (config.images?.length ?? 0) > 0) && (
        <CardDivider />
      )}

      {config.description ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {config.description}
        </Text>
      ) : null}

      <ImagesRow images={config.images} onImagePress={onImagePress} />

      {config.terms ? <Terms terms={config.terms} /> : null}

      {config.url ? (
        <VisitLinkButton url={config.url} onVisit={onVisit} />
      ) : null}
    </View>
  );
}

function CashbackConfigCard({
  config,
  onImagePress,
  onVisit,
  favorited,
  favoriteCount,
  pending,
  onToggleFavorite,
}: {
  config: BaseRunningCreditConfig & { favorite_count: number };
  onImagePress: (index: number) => void;
  onVisit: () => void;
  favorited: boolean;
  favoriteCount: number;
  pending: boolean;
  onToggleFavorite: () => void;
}) {
  const theme = useThemeTokens();
  const headline = cashbackHeadline(config);
  const metaLine = cashbackMeta(config);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <View style={styles.cardTitleRow}>
        <Text
          numberOfLines={3}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 17,
            lineHeight: 22,
            letterSpacing: -0.3,
          }}
        >
          {headline}
        </Text>

        <View style={styles.favGroup}>
          {favoriteCount > 0 ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyMedium,
                fontSize: 12,
                marginRight: 4,
              }}
            >
              {favoriteCount}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={onToggleFavorite}
            disabled={pending}
            accessibilityRole="button"
            accessibilityState={{ selected: favorited }}
            accessibilityLabel={
              favorited ? "Remove from favorites" : "Add to favorites"
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.heartButton}
          >
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={22}
              color={favorited ? theme.colors.error : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {metaLine ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {metaLine}
        </Text>
      ) : null}

      {(metaLine != null || (config.images?.length ?? 0) > 0) && (
        <CardDivider />
      )}

      <ImagesRow images={config.images} onImagePress={onImagePress} />

      {config.terms ? <Terms terms={config.terms} /> : null}

      {config.url ? (
        <VisitLinkButton url={config.url} onVisit={onVisit} />
      ) : null}
    </View>
  );
}

function CardDivider() {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.cardDivider,
        { backgroundColor: theme.colors.surfaceBorder },
      ]}
    />
  );
}

function Terms({ terms }: { terms: string }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[styles.terms, { borderTopColor: theme.colors.surfaceBorder }]}
    >
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamilyMedium,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        Terms
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
        }}
      >
        {terms}
      </Text>
    </View>
  );
}

function ImagesRow({
  images,
  onImagePress,
}: {
  images: string[] | null;
  onImagePress: (index: number) => void;
}) {
  const theme = useThemeTokens();
  if (!images || images.length === 0) return null;
  return (
    <View
      style={[styles.imageWell, { backgroundColor: theme.colors.surfaceInput }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {images.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => onImagePress(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`View image ${i + 1} of ${images.length}`}
          >
            <Image
              source={{ uri }}
              style={[styles.offerImage, { borderRadius: theme.radii.sm }]}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function EmptyTabState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
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
      <Ionicons name={icon} size={28} color={theme.colors.textMuted} />
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  headerBackRow: { marginLeft: -4 },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  headerText: { flex: 1, minWidth: 0 },
  travelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  directionsPill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    opacity: 0.92,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
  },
  travelDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  tabWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  scroll: { flex: 1 },
  list: { gap: 12 },
  card: {
    padding: 18,
    borderWidth: 1,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  heartButton: {
    marginLeft: 4,
    marginTop: -2,
  },
  favGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  terms: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  imageWell: {
    padding: 10,
    borderRadius: 12,
  },
  offerImage: {
    width: 200,
    height: 125,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderWidth: 1,
    marginTop: 8,
  },
});
