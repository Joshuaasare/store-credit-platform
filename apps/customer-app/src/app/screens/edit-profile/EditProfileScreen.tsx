import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import GlassInput from "../../shared/components/GlassInput";
import PhoneInput from "../../shared/components/PhoneInput";
import PageHeader from "../../shared/components/PageHeader";
import { computeInitials } from "../../shared/utils/computeInitials";
import { formatGhanaPhone } from "../../shared/utils/formatGhanaPhone";
import { compressImageToLocalFile } from "../../shared/utils/compressImage";
import { customerProfileService, storage } from "../../api/client";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import type { AppStackParamList } from "../../navigation/RootNavigator";
import AvatarSourcePicker from "./components/AvatarSourcePicker";
import OtpVerifyModal from "./components/OtpVerifyModal";

type Props = NativeStackScreenProps<AppStackParamList, "EditProfile">;

const AVATAR_SIZE = 100;
const AVATAR_BUCKET = "customer-avatars";

export function EditProfileScreen({ navigation }: Props) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Strip the leading `+` from the stored E.164 phone so PhoneInput's
  // value prop matches the "233XXXXXXXXX" wire format it expects.
  const currentPhone = useMemo(() => {
    if (!user?.phone) return "";
    return user.phone.replace(/^\+/, "");
  }, [user?.phone]);

  const [surname, setSurname] = useState(user?.surname ?? "");
  const [otherNames, setOtherNames] = useState(user?.other_names ?? "");
  const [phone, setPhone] = useState(currentPhone);

  // Avatar upload-in-flight flag. Picking a photo auto-commits (compress
  // → upload → PATCH), mirroring the webapp's StoreHero flow — no
  // separate "Update" tap for the avatar. The spinner overlays the
  // avatar while this is true.
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Phone-change sub-flow state.
  const [phoneVerifiedToken, setPhoneVerifiedToken] = useState<string | null>(
    null,
  );
  // The exact phone string the customer verified. Bound to the field —
  // if the customer edits the phone after verify, the checkmark
  // disappears and the Verify button returns.
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Modal visibility.
  const [pickerVisible, setPickerVisible] = useState(false);
  // Avatar screen rect, measured on tap via `measureInWindow`. Passed
  // to `react-native-popover-view` as the `from` anchor so the source
  // dropdown floats just below the avatar.
  const [pickerAnchor, setPickerAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 0, height: 0 });
  const avatarRef = useRef<View>(null);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpPending, setOtpPending] = useState(false);
  const [sendOtpPending, setSendOtpPending] = useState(false);

  // Page-level submit state + error.
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // ─── Derived verification state ──────────────────────────────────────
  // Three states:
  //   - phone === currentPhone → no Verify button, no checkmark (the
  //     field is unchanged).
  //   - phone === verifiedPhone → checkmark shown, phone field read-only
  //     for the verify lifecycle (the customer can still edit it; doing
  //     so resets verification per the spec — see `handlePhoneChange`).
  //   - else → Verify button shown, Update disabled.
  const phoneUnchanged = phone === currentPhone;
  const phoneVerified = !phoneUnchanged && phone === verifiedPhone;
  const needsVerify = !phoneUnchanged && !phoneVerified;

  // The Update button activates when:
  //   - the customer has a non-empty surname, AND
  //   - either the phone is unchanged, OR the phone is verified.
  const surnameTrimmed = surname.trim();
  const canSubmit =
    !submitting &&
    !sendOtpPending &&
    !otpPending &&
    surnameTrimmed.length > 0 &&
    (phoneUnchanged || phoneVerified);

  // The avatar URL to display — straight from the auth store. Picking
  // a photo auto-commits (upload + PATCH + setUser), so there's no
  // local staging state: the moment the PATCH succeeds, every surface
  // that reads `user` re-renders with the new URL.
  const displayAvatarUri: string | null = user?.avatar_url ?? null;
  const fullName =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";
  const initials = computeInitials(fullName);
  // "Remove photo" link appears only when there's an avatar set to
  // remove. Disabled mid-upload so a remove can't race the in-flight
  // PATCH from a just-picked photo.
  const hasAvatarToRemove = displayAvatarUri != null && !avatarUploading;

  // ─── Handlers ────────────────────────────────────────────────────────

  const handlePhoneChange = (next: string) => {
    setPhone(next);
    // Editing the phone after verify resets verification — the
    // checkmark disappears, the Verify button returns, the
    // phone-verified token is dropped.
    if (verifiedPhone !== null && next !== verifiedPhone) {
      setVerifiedPhone(null);
      setPhoneVerifiedToken(null);
    }
    // Editing the phone back to the current phone also clears any
    // stale verification (no-op semantically — the customer can't
    // "verify" their current phone).
    if (next === currentPhone) {
      setVerifiedPhone(null);
      setPhoneVerifiedToken(null);
    }
  };

  const handleVerifyPress = async () => {
    if (!phone || phone === currentPhone) return;
    setSendOtpPending(true);
    setOtpError(null);
    try {
      const res = await customerProfileService.sendPhoneChangeOtp({
        newPhone: phone,
      });
      if (!res.success) {
        setPageError(res.error);
        return;
      }
      setPageError(null);
      setOtpVisible(true);
    } catch (e) {
      setPageError(
        e instanceof Error ? e.message : "Failed to send verification code",
      );
    } finally {
      setSendOtpPending(false);
    }
  };

  const handleOtpVerify = async (otp: string) => {
    if (!otp) {
      setOtpError("Enter the code");
      return;
    }
    setOtpPending(true);
    setOtpError(null);
    try {
      const res = await customerProfileService.verifyPhoneChangeOtp({
        newPhone: phone,
        otp,
      });
      if (!res.success) {
        setOtpError(res.error);
        return;
      }
      setPhoneVerifiedToken(res.data.phoneVerifiedToken);
      setVerifiedPhone(phone);
      setOtpVisible(false);
      setOtpError(null);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setOtpPending(false);
    }
  };

  const handleOtpResend = async () => {
    setOtpError(null);
    try {
      const res = await customerProfileService.sendPhoneChangeOtp({
        newPhone: phone,
      });
      if (!res.success) {
        setOtpError(res.error);
      }
    } catch (e) {
      setOtpError(
        e instanceof Error ? e.message : "Failed to resend verification code",
      );
    }
  };

  const handleOtpDismiss = () => {
    setOtpVisible(false);
    setOtpError(null);
    // Per spec: dismissing cancels the sub-flow — the phone field keeps
    // the new string but loses the checkmark. The customer can tap
    // Verify again to restart.
  };

  // Auto-commit an avatar change — the webapp's StoreHero pattern. No
  // staging, no "Update profile" tap: compress (already done by the
  // caller for pick, or null for remove) → upload via the generic
  // /storage/upload-url endpoint → PATCH /me/profile with the new
  // publicUrl (or null) → setUser so every surface re-renders. The
  // spinner overlays the avatar while in flight; `pageError` surfaces
  // any failure. Mid-flight, the avatar tap + Remove link are
  // disabled so two uploads can't race.
  const commitAvatarChange = async (localUri: string | null) => {
    setAvatarUploading(true);
    setPageError(null);
    try {
      let newAvatarUrl: string | null = null;
      if (localUri != null) {
        const blob = await readLocalUriAsBlob(localUri);
        const { publicUrl } = await storage.uploadFile(blob, {
          bucket: AVATAR_BUCKET,
          folder: `customer-${user?.customer_id}/avatar`,
          id: user?.customer_id,
          contentType: "image/jpeg",
        });
        newAvatarUrl = publicUrl;
      }
      const res = await customerProfileService.updateProfile({
        avatar_url: newAvatarUrl,
      });
      if (!res.success) {
        setPageError(res.error);
        return;
      }
      setUser(res.data.user);
    } catch (e) {
      setPageError(
        e instanceof Error ? e.message : "Failed to update photo",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    // Permission request — iOS silently fails the launch if not granted,
    // Android auto-grants at install. We ask first so the customer
    // understands why the camera opens.
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setPickerVisible(false);
      setPageError("Camera permission is required to take a photo.");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      // Close the source popover AFTER the picker dismisses — closing
      // before `launch*Async` creates a modal-dismiss-vs-present race
      // on iOS that silently drops the picker (react-native-popover-view
      // uses an animated Modal whose fade-out is in flight when the
      // picker tries to present).
      setPickerVisible(false);
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const compressed = await compressImageToLocalFile(result.assets[0].uri);
      await commitAvatarChange(compressed.uri);
    } catch (e) {
      setPickerVisible(false);
      setPageError(e instanceof Error ? e.message : "Failed to capture photo");
    }
  };

  const handleChooseFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPickerVisible(false);
      setPageError("Photo library permission is required to pick a photo.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      // Close the source popover AFTER the picker dismisses — see
      // `handleTakePhoto` for the modal-stacking race rationale.
      setPickerVisible(false);
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const compressed = await compressImageToLocalFile(result.assets[0].uri);
      await commitAvatarChange(compressed.uri);
    } catch (e) {
      setPickerVisible(false);
      setPageError(e instanceof Error ? e.message : "Failed to pick photo");
    }
  };

  const handleRemovePhoto = () => {
    commitAvatarChange(null);
  };

  // Measure the avatar's screen rect, then open the source popover
  // anchored to it. `measureInWindow` gives viewport coordinates;
  // `react-native-popover-view` handles placement + edge clamping.
  const handleAvatarPress = () => {
    avatarRef.current?.measureInWindow((x, y, width, height) => {
      setPickerAnchor({ x, y, width, height });
      setPickerVisible(true);
    });
  };

  // Read a local file URI into a Blob for the PUT to the signed
  // Supabase URL. `fetch(fileUri)` works on both iOS and Android in
  // the Expo / React Native runtime — the result is a Blob whose
  // size matches the compressed bytes.
  const readLocalUriAsBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    return response.blob();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!surnameTrimmed) {
      setPageError("Enter your surname");
      return;
    }
    setSubmitting(true);
    setPageError(null);
    try {
      // Build the PATCH body — only the name/phone fields that changed.
      // Avatar is handled separately by `commitAvatarChange` (auto-
      // commits on photo pick, webapp-style).
      const body: {
        surname?: string;
        other_names?: string;
        newPhone?: string;
        phoneVerifiedToken?: string;
      } = {};
      if (surnameTrimmed !== (user?.surname ?? ""))
        body.surname = surnameTrimmed;
      if (otherNames.trim() !== (user?.other_names ?? ""))
        body.other_names = otherNames.trim();
      if (phoneVerified && phone !== currentPhone && phoneVerifiedToken) {
        body.newPhone = phone;
        body.phoneVerifiedToken = phoneVerifiedToken;
      }

      // No-op guard — if nothing changed, just stay on the page.
      if (
        body.surname === undefined &&
        body.other_names === undefined &&
        body.newPhone === undefined
      ) {
        setSubmitting(false);
        return;
      }

      const res = await customerProfileService.updateProfile(body);
      // apiService throws on non-2xx, so this branch is unreachable at
      // runtime — but it's the union narrowing TS needs to allow
      // `res.data.user` below, and it's a cheap defensive guard.
      if (!res.success) {
        setPageError(res.error);
        return;
      }

      // Commit to the auth store — the PageHeader and every other
      // surface that reads `user` re-renders with the new data. The
      // page stays on screen (no auto-navigate back) per the spec.
      setUser(res.data.user);

      // Reset the phone-change sub-flow — the new baseline is the
      // server's view, so the verified token + verifiedPhone are
      // dropped. `phone` state stays as the new phone (which is now
      // currentPhone for the next render cycle).
      setPhoneVerifiedToken(null);
      setVerifiedPhone(null);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update profile";
      setPageError(message);
      // If the phone verification expired between verify and Update,
      // reset the verification so the customer has to re-verify —
      // otherwise the "Verified" chip stays on with no Verify button
      // and the customer is stuck. (apiService throws on non-2xx, so
      // the reset has to live in the catch block, not a `!res.success`
      // branch.)
      const lower = message.toLowerCase();
      if (lower.includes("phone verification") || lower.includes("expired")) {
        setVerifiedPhone(null);
        setPhoneVerifiedToken(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayPhoneForOtp = phone ? formatGhanaPhone("+" + phone) : "";

  return (
    <ScreenBackground>
      <PageHeader backLabel="Back" onBackPress={() => navigation.goBack()} />
      <ScreenBody edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar block — centered, 100px circular. Tapping opens the
              source popover anchored below the avatar. The camera badge
              sits bottom-right. */}
          <View style={styles.avatarBlock}>
            <TouchableOpacity
              ref={avatarRef}
              onPress={handleAvatarPress}
              disabled={avatarUploading}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              hitSlop={8}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: theme.colors.surfaceBorder,
                    backgroundColor: theme.colors.surfaceInput,
                    borderRadius: AVATAR_SIZE / 2,
                  },
                ]}
              >
                {displayAvatarUri != null ? (
                  <>
                    <Text
                      style={[
                        StyleSheet.absoluteFill,
                        styles.avatarInitials,
                        {
                          color: theme.colors.textMuted,
                          fontFamily: theme.typography.fontFamilySemiBold,
                          fontSize: 30,
                          lineHeight: AVATAR_SIZE,
                        },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {initials}
                    </Text>
                    <Image
                      source={{ uri: displayAvatarUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={150}
                      accessibilityIgnoresInvertColors
                    />
                  </>
                ) : (
                  <Text
                    style={[
                      styles.avatarInitials,
                      {
                        color: theme.colors.textMuted,
                        fontFamily: theme.typography.fontFamilySemiBold,
                        fontSize: 30,
                        lineHeight: AVATAR_SIZE,
                      },
                    ]}
                  >
                    {initials}
                  </Text>
                )}
                {/* Upload-in-flight spinner overlay — dims the avatar
                    and shows a centered spinner while the compress →
                    upload → PATCH round-trip is in flight. */}
                {avatarUploading ? (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.avatarUploadingOverlay,
                      {
                        borderRadius: AVATAR_SIZE / 2,
                        backgroundColor: theme.colors.scrim,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.textOnPrimary}
                    />
                  </View>
                ) : null}
                {/* Camera badge — small chip anchored bottom-right. */}
              </View>
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color={theme.colors.textOnPrimary}
                />
              </View>
            </TouchableOpacity>

            <Pressable
              onPress={handleAvatarPress}
              disabled={avatarUploading}
              hitSlop={8}
              style={styles.avatarLinkRow}
            >
              <Text
                style={[
                  styles.avatarLink,
                  {
                    color: theme.colors.primary,
                    fontFamily: theme.typography.fontFamilySemiBold,
                  },
                ]}
              >
                {avatarUploading ? "Updating photo…" : "Change photo"}
              </Text>
            </Pressable>
            {hasAvatarToRemove ? (
              <Pressable
                onPress={handleRemovePhoto}
                hitSlop={8}
                style={styles.avatarLinkRow}
              >
                <Text
                  style={[
                    styles.avatarLink,
                    {
                      color: theme.colors.error,
                      fontFamily: theme.typography.fontFamilyMedium,
                    },
                  ]}
                >
                  Remove photo
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Form card — mirrors NewUserScreen's styling. */}
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            Surname
          </Text>
          <GlassInput
            value={surname}
            onChangeText={setSurname}
            placeholder="Surname"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!submitting}
          />

          <Text
            style={[
              styles.label,
              styles.labelSpacing,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            Other names
          </Text>
          <GlassInput
            value={otherNames}
            onChangeText={setOtherNames}
            placeholder="Other names"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!submitting}
          />

          <Text
            style={[
              styles.label,
              styles.labelSpacing,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            Phone
          </Text>
          <View style={styles.phoneRow}>
            <View style={styles.phoneInputWrap}>
              <PhoneInput
                value={phone}
                onChange={handlePhoneChange}
                defaultCountryCode={undefined}
              />
            </View>
            {phoneVerified ? (
              <View
                style={[
                  styles.verifyChip,
                  {
                    backgroundColor: theme.colors.successSurface,
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.verifyChipText,
                    {
                      color: theme.colors.success,
                      fontFamily: theme.typography.fontFamilySemiBold,
                    },
                  ]}
                >
                  Verified
                </Text>
              </View>
            ) : needsVerify ? (
              <TouchableOpacity
                onPress={handleVerifyPress}
                disabled={sendOtpPending || submitting || otpPending}
                accessibilityRole="button"
                accessibilityLabel="Verify new phone number"
                hitSlop={8}
                style={[
                  styles.verifyButton,
                  {
                    borderColor: theme.colors.primary,
                    backgroundColor: "transparent",
                  },
                ]}
              >
                {sendOtpPending ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.verifyButtonText,
                      {
                        color: theme.colors.primary,
                        fontFamily: theme.typography.fontFamilySemiBold,
                      },
                    ]}
                  >
                    Verify
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {pageError ? (
            <Text
              style={[
                styles.error,
                {
                  color: theme.colors.error,
                  fontFamily: theme.typography.fontFamilyRegular,
                },
              ]}
            >
              {pageError}
            </Text>
          ) : null}

          <PrimarySubmitButton
            label="Update profile"
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
            theme={theme}
          />
        </ScrollView>
      </ScreenBody>

      <AvatarSourcePicker
        isVisible={pickerVisible}
        anchor={pickerAnchor}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onDismiss={() => setPickerVisible(false)}
      />

      <OtpVerifyModal
        visible={otpVisible}
        displayPhone={displayPhoneForOtp}
        error={otpError}
        isPending={otpPending}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        onDismiss={handleOtpDismiss}
      />
    </ScreenBackground>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PrimarySubmitButton — local variant of PrimaryButton that takes a
// `disabled` + `loading` and uses the theme's primary fill. We don't
// reuse the shared `PrimaryButton` because that component's `disabled`
// styling is a static 0.5 opacity; we want the gating to come from
// `canSubmit` (which already factors in submit + send-otp + otp-pending
// + surname + phone verification). The shared component is fine for
// simple forms; this screen has more gating dimensions.
// ────────────────────────────────────────────────────────────────────────────
function PrimarySubmitButton({
  label,
  loading,
  disabled,
  onPress,
  theme,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  const isDisabled = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.submit,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.md,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textOnPrimary} />
      ) : (
        <Text
          style={{
            color: theme.colors.textOnPrimary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 15,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollBody: {
    paddingBottom: 40,
  },
  avatarBlock: {
    alignItems: "center",
    paddingVertical: 16,
    position: "relative",
    gap: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitials: {
    textAlign: "center",
  },
  avatarUploadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  avatarLinkRow: {
    paddingVertical: 2,
  },
  avatarLink: {
    fontSize: 14,
  },
  card: {
    marginHorizontal: 0,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  labelSpacing: {
    marginTop: 16,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneInputWrap: {
    flex: 1,
  },
  verifyButton: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    fontSize: 14,
  },
  verifyChip: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifyChipText: {
    fontSize: 13,
  },
  error: {
    fontSize: 13,
    marginTop: 12,
  },
  submit: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
});
