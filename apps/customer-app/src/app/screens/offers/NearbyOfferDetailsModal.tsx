import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import OfferDetailsCard from "../../shared/components/OfferDetailsCard";
import { ImageLightbox } from "../../shared/components/ImageLightbox";
import { customerConfigInteractionService } from "../../api/client";
import { useCustomerFavorites } from "../../shared/hooks/useCustomerFavorites";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import {
  cashbackHeadline,
  cashbackMeta,
  formatFixedDateRange,
} from "../../shared/utils/configDisplay";

// Card click → full offer details in a centered modal, same contract as the
// favorites modal. No navigation — only "See all" navigates.
export default function NearbyOfferDetailsModal({
  offer,
  onClose,
}: {
  offer: NearbyOfferRow | null;
  onClose: () => void;
}) {
  const theme = useThemeTokens();
  const favorites = useCustomerFavorites();
  const [viewer, setViewer] = useState<{
    images: string[];
    start: number;
  } | null>(null);

  const recordVisit = (configType: "running" | "fixed", configId: number) => {
    void customerConfigInteractionService
      .recordClick({ configType, configId })
      .catch(() => {});
  };

  if (offer == null) return null;

  const isFixed = offer.config_type === "fixed";
  const merchantName = offer.merchant?.name ?? "Merchant";
  const images = offer.config.images ?? [];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.colors.scrim }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.backgroundSolid,
              borderRadius: theme.radii.md,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <MerchantAvatar
              merchantName={merchantName}
              logoUrl={offer.merchant?.logo_url ?? null}
              idSeed={offer.merchant?.id}
              size={34}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.primary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {merchantName}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <OfferDetailsCard
              title={
                isFixed
                  ? offer.config.title?.trim() || "Discount offer"
                  : cashbackHeadline(offer.config)
              }
              titleNumberOfLines={3}
              metaText={
                isFixed
                  ? formatFixedDateRange(
                      offer.config.start_date,
                      offer.config.end_date,
                    )
                  : cashbackMeta(offer.config)
              }
              metaIcon={isFixed ? "calendar-outline" : undefined}
              description={isFixed ? offer.config.description : null}
              images={images}
              onImagePress={
                images.length > 0
                  ? (i) => setViewer({ images, start: i })
                  : undefined
              }
              terms={offer.config.terms}
              url={offer.config.url}
              onVisit={() => recordVisit(offer.config_type, offer.config.id)}
              favorited={favorites.isFavorited(
                offer.config_type,
                offer.config.id,
              )}
              favoriteCount={favorites.countFor(
                offer.config_type,
                offer.config.id,
                offer.config.favorite_count,
              )}
              pending={favorites.pendingFor(offer.config_type, offer.config.id)}
              onToggleFavorite={() =>
                favorites.toggleFavorite(offer.config_type, offer.config.id)
              }
            />
          </ScrollView>
        </Pressable>
      </Pressable>

      <ImageLightbox
        images={viewer?.images ?? []}
        visible={viewer != null}
        startIndex={viewer?.start ?? 0}
        onDismiss={() => setViewer(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 10,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
});