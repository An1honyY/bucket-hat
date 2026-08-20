import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { autocompletePlaces, getPlaceLocation, hasPlacesApiKey, newSessionToken, type PlaceSuggestion } from "../services/placesService";
import type { ServiceError } from "../services/types";
import useTheme from "../theme/useTheme";
import { RADIUS, SPACING, TYPE } from "../theme/typography";

// Google Places-backed address field — docs/02-external-apis.md §2, docs/
// 04-screens-navigation.md §4 "Plan" bullet's "free text via Google Places,
// debounced ~300ms." Shared by LocationForm and onboarding's location step
// rather than each screen re-implementing the debounce/session-token/
// fallback logic. Falls back to a plain text input (no dropdown) when no
// API key is configured — same "not configured is the same shape of
// failure as unreachable" treatment routesService.ts already established.
const DEBOUNCE_MS = 300;

const ERROR_MESSAGES: Record<ServiceError, string> = {
  network: "Couldn't search — check your connection.",
  "rate-limited": "Address search is briefly rate-limited — try again in a moment.",
  unreachable: "Address search isn't available right now.",
  // placesService never returns this — it is routing's "Google knows of no
  // such route" — but the map is exhaustive over ServiceError on purpose, so
  // the next value added here has to be given words rather than silently
  // rendering blank.
  "no-route": "No matching places.",
};

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  /**
   * Take the caret on mount.
   *
   * Set by anything that opens *in order to be typed into* — a picker sheet
   * whose whole content is this field. Without it, opening the sheet and
   * then clicking its input are two separate clicks to do one thing.
   */
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Select the existing text on focus, so the first keystroke replaces it
   *  instead of appending to it. */
  selectTextOnFocus?: boolean;
  /**
   * Rows to show above the Places results, in the same dropdown.
   *
   * The web picker puts the user's saved locations here, so "somewhere I've
   * saved" and "anywhere else" are one list under one input rather than two
   * separate things to aim at. Present rows keep the dropdown open even with
   * no Places suggestions yet.
   */
  extraRows?: ReactNode;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
  autoFocus = false,
  onFocus,
  onBlur,
  selectTextOnFocus = false,
  extraRows,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [error, setError] = useState<ServiceError | undefined>(undefined);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Guards against a slow, stale autocomplete response overwriting a
  // faster, more recent one — each debounced call stamps the request it
  // started with, and only the still-current one is allowed to apply its
  // results when it resolves.
  const requestIdRef = useRef(0);
  const enabled = hasPlacesApiKey();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChangeText(text: string) {
    onChangeText(text);
    if (!enabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setError(undefined);
    if (!text.trim()) {
      requestIdRef.current += 1; // invalidate any in-flight search
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const result = await autocompletePlaces(text, sessionTokenRef.current);
      if (requestId !== requestIdRef.current) return; // a newer search superseded this one
      setSearching(false);
      if ("data" in result) {
        setSuggestions(result.data);
      } else {
        setSuggestions([]);
        setError(result.error);
      }
    }, DEBOUNCE_MS);
  }

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    requestIdRef.current += 1; // a selection also invalidates any in-flight search
    setSuggestions([]);
    setError(undefined);
    setResolving(true);
    const result = await getPlaceLocation(suggestion.placeId, sessionTokenRef.current);
    setResolving(false);
    // A fresh token starts the next autocomplete session — reusing this one
    // past its details call would incorrectly bill the *next* search as
    // part of the session that just completed.
    sessionTokenRef.current = newSessionToken();
    if (!("data" in result)) {
      setError(result.error);
      return;
    }
    const address = result.data.formattedAddress || `${suggestion.primaryText}, ${suggestion.secondaryText}`;
    onChangeText(address);
    onSelectPlace({ address, lat: result.data.lat, lng: result.data.lng });
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? "Start typing an address…"}
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          selectTextOnFocus={selectTextOnFocus}
        />
        {(searching || resolving) && <ActivityIndicator size="small" color={theme.textSecondary} style={styles.spinner} />}
      </View>
      {(extraRows || suggestions.length > 0) && (
        <View style={styles.dropdown}>
          {extraRows}
          {suggestions.map((s) => (
            <Pressable key={s.placeId} onPress={() => selectSuggestion(s)} style={styles.suggestion}>
              <Text style={styles.suggestionPrimary}>{s.primaryText}</Text>
              {s.secondaryText.length > 0 && <Text style={styles.suggestionSecondary}>{s.secondaryText}</Text>}
            </Pressable>
          ))}
        </View>
      )}
      {error && <Text style={styles.errorText}>{ERROR_MESSAGES[error]}</Text>}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    inputRow: { flexDirection: "row", alignItems: "center" },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      minHeight: 44,
      ...TYPE.body,
      color: theme.textPrimary,
    },
    spinner: { position: "absolute", right: SPACING.md },
    dropdown: {
      marginTop: SPACING.xs,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceRaised,
      overflow: "hidden",
    },
    suggestion: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 48, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.border },
    suggestionPrimary: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    suggestionSecondary: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
    errorText: { ...TYPE.caption, color: theme.danger, marginTop: SPACING.xs },
  });
}
