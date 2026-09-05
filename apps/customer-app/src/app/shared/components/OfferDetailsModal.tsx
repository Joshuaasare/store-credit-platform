import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type {
  FavoritedConfig,
  NearbyOfferRow,
} from "@store-credit-platform/api-services";
import MerchantAvatar from "./MerchantAvatar";
import OfferDetailsCard from "./OfferDetailsCard";
import { ImageLightbox } from "./ImageLightbox";
import { customerConfigInteractionService } from "../../api/client";
import { useCustomerFavorites } from "../hooks/useCustomerFavorites";
import { useThemeTokens } from "../theme/ThemeContext";
import {
  cashbackHeadline,
  cashbackMeta,
  fixedExpiryMeta,
  fixedExpiryTone,
} from "../utils/configDisplay";

// Offer row from either the nearby feed or the favorites feed — they share
// the same config_type/config/merchant surface this modal needs.
type OfferRow = NearbyOfferRow | FavoritedConfig;

// Full offer details in a centered modal, shared by the offers, favorites,
// and explore flows. No navigation — callers own how the modal is opened.
export default function OfferDetailsModal({
  offer,
  onClose,
}: {
  offer: OfferRow | null;
  onClose: () => void;
}) {
  const theme = useThemeTokens();
  const favorites = useCustomerFavorites();
  const [viewer, setViewer] = useState<{
    images: string[];
    start: number;
  } | null>(null);

  // Fire-and-forget: the link itself already opened, so a failed click
  // tally is silently dropped.
  const recordVisit = (configType: "running" | "fixed", configId: number) => {
    void customerConfigInteractionService
      .recordClick({ configType, configId })
      .catch(() => {});
  };

  if (offer == null) return null;

  const { config, merchant, config_type } = offer;
  const isFixed = config_type === "fixed";
  const merchantName = merchant?.name ?? "Merchant";
  const images = config.images ?? [];

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
              logoUrl={merchant?.logo_url ?? null}
              idSeed={merchant?.id}
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
                  ? config.title?.trim() || "Discount offer"
                  : cashbackHeadline(config)
              }
              titleNumberOfLines={3}
              metaText={
                isFixed
                  ? fixedExpiryMeta(config.end_date)
                  : cashbackMeta(config)
              }
              metaTone={isFixed ? fixedExpiryTone(config.end_date) : "success"}
              metaIcon={isFixed ? "calendar-outline" : undefined}
              description={isFixed ? config.description : null}
              images={images}
              onImagePress={
                images.length > 0
                  ? (i) => setViewer({ images, start: i })
                  : undefined
              }
              terms={config.terms}
              url={config.url}
              onVisit={() => recordVisit(config_type, config.id)}
              favorited={favorites.isFavorited(config_type, config.id)}
              favoriteCount={favorites.countFor(
                config_type,
                config.id,
                config.favorite_count,
              )}
              pending={favorites.pendingFor(config_type, config.id)}
              onToggleFavorite={() =>
                favorites.toggleFavorite(config_type, config.id)
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