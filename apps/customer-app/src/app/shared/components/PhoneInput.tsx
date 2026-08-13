import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  countries,
  Country,
  CountryCode,
  defaultCountry,
  formatPhoneWithCountry,
  parsePhoneNumber,
} from "../../utils/countries";
import { useThemeTokens } from "../../theme/ThemeContext";

/**
 * Flag emoji don't render on Android (the system font lacks the
 * regional-indicator glyph pair → shows as "??" or tofu). Use a PNG from
 * flagcdn.com instead — 40px wide, works cross-platform, no local assets.
 */
function flagUrl(code: CountryCode): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

interface PhoneInputProps {
  /** Full international format without `+` (e.g. "233244444444"). Empty string when cleared. */
  value: string;
  onChange: (full: string) => void;
  placeholder?: string;
  defaultCountryCode?: CountryCode;
}

/**
 * Glass-styled phone input with a tappable country picker (flag + dial code)
 * and a local-number field. Mirrors the webapp's PhoneInput component: the
 * caller stores the full international format (no `+`), the component
 * internally splits it into country + local number for display.
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder = "24 444 4444",
  defaultCountryCode = CountryCode.GH,
}: PhoneInputProps) {
  const theme = useThemeTokens();

  const initial = useMemo(() => {
    if (!value) {
      return {
        country: defaultCountry,
        localNumber: "",
      };
    }
    const parsed = parsePhoneNumber(value);
    return {
      country: parsed.country ?? defaultCountry,
      localNumber: parsed.localNumber,
    };
  }, [value]);

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    initial.country,
  );
  const [localNumber, setLocalNumber] = useState<string>(initial.localNumber);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const update = (newLocal: string, newCountry: Country) => {
    if (!newLocal.trim()) {
      onChange("");
      return;
    }
    onChange(formatPhoneWithCountry(newLocal, newCountry.code));
  };

  const handleLocalChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 15);
    setLocalNumber(cleaned);
    update(cleaned, selectedCountry);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setPickerOpen(false);
    setQuery("");
    update(localNumber, country);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={[
            styles.countryButton,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.surfaceBorder,
              borderTopLeftRadius: theme.radii.md,
              borderBottomLeftRadius: theme.radii.md,
            },
          ]}
          onPress={() => setPickerOpen(true)}
        >
          <Image
            source={{ uri: flagUrl(selectedCountry.code) }}
            style={styles.flag}
            resizeMode="cover"
          />
          <Text
            style={[
              styles.dialCode,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            +{selectedCountry.dialCode}
          </Text>
          <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>
            ▾
          </Text>
        </Pressable>
        <TextInput
          value={localNumber}
          onChangeText={handleLocalChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textPlaceholder}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.surfaceBorder,
              borderTopRightRadius: theme.radii.md,
              borderBottomRightRadius: theme.radii.md,
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
        />
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.sheet,
                borderTopLeftRadius: theme.radii.xl,
                borderTopRightRadius: theme.radii.xl,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                styles.sheetTitle,
                {
                  color: theme.colors.sheetText,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
            >
              Select country
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or dial code"
              placeholderTextColor={theme.colors.textPlaceholder}
              style={[
                styles.search,
                {
                  backgroundColor: theme.colors.sheetInput,
                  color: theme.colors.sheetText,
                  fontFamily: theme.typography.fontFamilyRegular,
                },
              ]}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Image
                    source={{ uri: flagUrl(item.code) }}
                    style={styles.optionFlag}
                    resizeMode="cover"
                  />
                  <Text
                    style={[
                      styles.optionName,
                      {
                        color: theme.colors.sheetText,
                        fontFamily: theme.typography.fontFamilyRegular,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDial,
                      {
                        color: theme.colors.sheetTextMuted,
                        fontFamily: theme.typography.fontFamilyMedium,
                      },
                    ]}
                  >
                    +{item.dialCode}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.sheetSeparator },
                  ]}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 56,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  flag: {
    width: 22,
    height: 16,
    borderRadius: 2,
  },
  dialCode: {
    fontSize: 15,
  },
  chevron: {
    fontSize: 10,
    marginLeft: 2,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  sheetTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  search: {
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionFlag: {
    width: 28,
    height: 20,
    borderRadius: 3,
    marginRight: 12,
  },
  optionName: {
    flex: 1,
    fontSize: 15,
  },
  optionDial: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginHorizontal: 4,
  },
});
