import { useSafeAreaInsets } from "react-native-safe-area-context";
import { constants } from "../constants/constants";

export const useOffsets = () => {
  // Android-only: lift the floating bar above the edge-to-edge system nav bar
  // (back/home/recents). useSafeAreaInsets().bottom adapts per device — 3-button
  // nav (~48dp), gesture nav (~24dp), or 0 on fullscreen devices — so this is
  // correct on every Android device without hardcoding. iOS keeps the fixed
  // 16px margin (the home indicator is not a touch-target conflict there).
  // Platform-specific per the RN skill: iOS is intentionally unchanged.
  const insets = useSafeAreaInsets();

  return {
    topOffset: insets.top,
    bottomOffset: insets.bottom,
    tabBarOffset: constants.SIZES.TAB_BAR_HEIGHT,
  };
};
