import { Linking } from "react-native";
import PrimaryButton from "./PrimaryButton";

export default function VisitLinkButton({
  url,
  onVisit,
}: {
  url: string;
  onVisit?: () => void;
}) {
  const open = () => {
    onVisit?.();
    void Linking.openURL(url).catch(() => {
      // Invalid or unopenable URL — silently ignore; the button is optional.
    });
  };
  return (
    <PrimaryButton
      title="Visit link"
      onPress={open}
      fullWidth
      style={{ marginTop: 14 }}
    />
  );
}
