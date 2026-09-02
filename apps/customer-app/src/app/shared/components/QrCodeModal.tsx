import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useThemeTokens } from "../theme/ThemeContext";
import { formatGhanaPhone } from "../utils/formatGhanaPhone";

// The QR encodes the E.164 phone (with the +) so merchant staff devices can
// scan it for lookup; the human-readable form below uses the local 0XX format.
export default function QrCodeModal({
  visible,
  onClose,
  phone,
}: {
  visible: boolean;
  onClose: () => void;
  phone: string | null;
}) {
  const theme = useThemeTokens();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.colors.scrim }]}
        onPress={onClose}
        accessibilityLabel="Close QR code"
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.backgroundSolid,
              borderRadius: theme.radii.md,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilyBold,
              fontSize: 18,
              letterSpacing: -0.2,
            }}
          >
            Your QR code
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 13,
              lineHeight: 19,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Show this to merchant staff to identify your account.
          </Text>

          <View
            style={[
              styles.codeWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.surfaceBorder,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            {phone ? (
              <QRCode
                value={phone}
                size={190}
                color={theme.colors.primary}
                backgroundColor="transparent"
              />
            ) : null}
          </View>

          {phone ? (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 16,
                letterSpacing: 0.4,
              }}
            >
              {formatGhanaPhone(phone)}
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
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
  sheet: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  codeWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderWidth: 1,
    marginVertical: 18,
  },
});
