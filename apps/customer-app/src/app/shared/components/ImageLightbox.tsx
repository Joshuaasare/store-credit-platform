import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "../theme/ThemeContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * Full-screen swipeable photo viewer. Dark, opaque backdrop; horizontal
 * paging between images; tap an image or the close button to dismiss.
 * Opens at `startIndex` (the thumbnail that was tapped).
 */
export function ImageLightbox({
  images,
  visible,
  startIndex = 0,
  onDismiss,
}: {
  images: string[];
  visible: boolean;
  startIndex?: number;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  if (!visible || images.length === 0) return null;

  const onViewableItemsChanged = ({ changed }: { changed: ViewToken[] }) => {
    const next = changed.find((c) => c.isViewable)?.index;
    if (next != null) setIndex(next);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.imageViewerBackdrop },
        ]}
      >
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, i) => `${item}-${i}`}
          getItemLayout={(_, i) => ({
            length: SCREEN_WIDTH,
            offset: i * SCREEN_WIDTH,
            index: i,
          })}
          initialScrollIndex={
            startIndex >= 0 && startIndex < images.length ? startIndex : 0
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={onDismiss}
              style={styles.page}
              accessibilityRole="button"
              accessibilityLabel="Close image viewer"
            >
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                transition={120}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          )}
        />

        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
          hitSlop={12}
          style={[
            styles.closeBtn,
            { top: insets.top + 10, backgroundColor: theme.colors.imageViewerChrome },
          ]}
        >
          <Ionicons name="close" size={26} color={theme.colors.textOnPrimary} />
        </Pressable>

        {images.length > 1 ? (
          <View
            pointerEvents="none"
            style={[styles.indexWrap, { bottom: insets.bottom + 18 }]}
          >
            <Text
              style={[
                styles.indexText,
                {
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
            >
              {Math.min(index + 1, images.length)} / {images.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  listContent: {
    alignItems: "center",
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  indexWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  indexText: {
    fontSize: 13,
    letterSpacing: 0.4,
  },
});