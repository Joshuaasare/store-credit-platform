import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { FavoritedConfig } from "@store-credit-platform/api-services";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import VisitLinkButton from "../../shared/components/VisitLinkButton";
import { customerConfigInteractionService } from "../../api/client";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import {
  cashbackHeadline,
  cashbackMeta,
  formatFixedDateRange,
} from "../../shared/utils/configDisplay";

export default function FavoriteDetailsModal({
  item,
  onClose,
}: {
  item: FavoritedConfig | null;
  onClose: () => void;
}) {
  const theme = useThemeTokens();

  // Fire-and-forget, same as the explore detail screen.
  const recordVisit = (configType: "running" | "fixed", configId: number) => {
    void customerConfigInteractionService
      .recordClick({ configType, configId })
      .catch(() => {
        // do nothing
      });
  };

  if (item == null) return null;

  const config = item.config;
  const merchantName = item.merchant?.name ?? "Merchant";
  const logoUrl = item.merchant?.logo_url ?? null;
  const isFixed = item.config_type === "fixed";
  const title = isFixed
    ? item.config.title?.trim() || "Discount offer"
    : cashbackHeadline(item.config);
  const metaLine = isFixed
    ? formatFixedDateRange(item.config.start_date, item.config.end_date)
    : cashbackMeta(item.config);
  const description = isFixed ? item.config.description : null;
  const [heroImage, ...extraImages] = config.images ?? [];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={[
                styles.hero,
                { borderRadius: theme.radii.lg },
              ]}
              contentFit="cover"
              transition={150}
            />
          ) : null}

          <View style={styles.header}>
            <MerchantAvatar
              merchantName={merchantName}
              logoUrl={logoUrl}
              idSeed={item.merchant?.id}
              size={36}
            />
            <View style={styles.headerText}>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {merchantName}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 17,
                  lineHeight: 22,
                  letterSpacing: -0.3,
                  marginTop: 2,
                }}
              >
                {title}
              </Text>
            </View>
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
            {metaLine ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 13,
                }}
              >
                {metaLine}
              </Text>
            ) : null}

            {description ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                  marginTop: metaLine ? 10 : 0,
                }}
              >
                {description}
              </Text>
            ) : null}

            {extraImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                style={styles.imageRow}
              >
                {extraImages.map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={styles.image}
                    contentFit="cover"
                    transition={150}
                  />
                ))}
              </ScrollView>
            ) : null}

            {config.terms ? (
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                  marginTop: 12,
                }}
              >
                {config.terms}
              </Text>
            ) : null}
          </ScrollView>

          {config.url ? (
            <View
              style={[
                styles.footer,
                { borderTopColor: theme.colors.surfaceBorder },
              ]}
            >
              <VisitLinkButton
                url={config.url}
                onVisit={() => recordVisit(item.config_type, config.id)}
              />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    overflow: "hidden",
  },
  hero: {
    width: "100%",
    height: 160,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginTop: -2,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  imageRow: {
    marginTop: 12,
  },
  image: {
    width: 180,
    height: 112,
    borderRadius: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
  },
});