import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import VisitLinkButton from "./VisitLinkButton";
import { useThemeTokens } from "../theme/ThemeContext";

// Shared offer detail card for the explore branch screen and the favorites
// modal. Knows nothing about config shapes — callers derive the strings.
export default function OfferDetailsCard({
  title,
  titleNumberOfLines = 2,
  metaText,
  metaIcon,
  description,
  images,
  onImagePress,
  terms,
  url,
  onVisit,
  favorited,
  favoriteCount,
  pending,
  onToggleFavorite,
}: {
  title: string;
  titleNumberOfLines?: number;
  metaText?: string | null;
  metaIcon?: keyof typeof Ionicons.glyphMap;
  description?: string | null;
  images?: string[] | null;
  onImagePress?: (index: number) => void;
  terms?: string | null;
  url?: string | null;
  onVisit?: () => void;
  favorited: boolean;
  favoriteCount: number;
  pending: boolean;
  onToggleFavorite: () => void;
}) {
  const theme = useThemeTokens();

  const hasBody =
    (description != null && description.length > 0) ||
    (images != null && images.length > 0);

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
      <View style={styles.titleRow}>
        <Text
          numberOfLines={titleNumberOfLines}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 15,
            lineHeight: 20,
            letterSpacing: -0.2,
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

      {metaText ? (
        <View style={styles.metaRow}>
          {metaIcon ? (
            <Ionicons
              name={metaIcon}
              size={12}
              color={theme.colors.textMuted}
            />
          ) : null}
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
              flexShrink: 1,
            }}
          >
            {metaText}
          </Text>
        </View>
      ) : null}

      {hasBody ? <CardDivider /> : null}

      {description ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {description}
        </Text>
      ) : null}

      <ImagesRow images={images} onImagePress={onImagePress} />

      {terms ? <Terms terms={terms} /> : null}

      {url ? <VisitLinkButton url={url} onVisit={onVisit} /> : null}
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
          fontFamily: theme.typography.fontFamilySemiBold,
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
  images: string[] | null | undefined;
  onImagePress?: (index: number) => void;
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
            onPress={() => onImagePress?.(i)}
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

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderWidth: 1,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  favGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  heartButton: {
    marginLeft: 4,
    marginTop: -2,
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
});
