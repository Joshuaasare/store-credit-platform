import { RefreshControl } from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

// On Android the native scroll view is injected as a child of the
// RefreshControl, so children MUST be rendered or the screen goes blank
// (facebook/react-native#49878).
export default function AppRefreshControl({
  refreshing,
  onRefresh,
  progressViewOffset,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  progressViewOffset?: number;
  children?: React.ReactNode;
}) {
  const theme = useThemeTokens();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.surface}
      progressViewOffset={progressViewOffset}
    >
      {children}
    </RefreshControl>
  );
}