import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PlanIntent, RootStackParamList } from "../../navigation/types";
import { deleteSavedRoute, listSavedRoutes, touchSavedRoute, updateSavedRoute } from "../../db/repositories/savedRoutes";
import { listLocations } from "../../db/repositories/locations";
import { showAlert } from "../../lib/crossPlatformAlert";
import { defaultRouteLabel } from "../../lib/placeLabel";
import BottomSheet from "../../components/BottomSheet";
import ScreenSurface from "../../components/ScreenSurface";
import ActionIcon from "../../components/ActionIcon";
import AppButton from "../../components/AppButton";
import ModeIcon from "../../components/ModeIcon";
import useTheme from "../../theme/useTheme";
import { cardElevationStyle } from "../../theme/tokens";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { RADIUS, SPACING, TYPE } from "../../theme/typography";
import type { SavedLocation, SavedRoute } from "../../types";

// docs/04-screens-navigation.md §4.3 — the trips you take often, kept as
// reusable shapes rather than as the specific dated journeys they came from.
//
// A `SavedRoute` has never carried a date, a time or a forecast (§4.3), and
// that's exactly what makes it reusable: this screen is where one gets
// pointed at a *new* time. Every action here ends at the Plan screen with
// the route pre-filled — nothing is planned, scheduled or notified from
// here, because planning needs the live routing and weather calls Plan
// already owns (§5), and duplicating that here would be a second code path
// for the app's most important operation.
//
// Structurally a sibling of the Locations screen (§4.3): favourites pinned
// on top, a star per row, tap to act, empty state that says what to do next.
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recurrenceSummary(route: SavedRoute): string | undefined {
  if (!route.recurrence || route.recurrence.daysOfWeek.length === 0) return undefined;
  const days = route.recurrence.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
  return `Repeats ${days}`;
}

export default function SavedJourneysScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  // The tapped row's action sheet. A sheet rather than three buttons per
  // row: "use it now" and "rename it" are different kinds of action, and a
  // list where every row carries five controls is a list nobody scans.
  const [active, setActive] = useState<SavedRoute | null>(null);
  const [renaming, setRenaming] = useState<SavedRoute | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const reload = useCallback(() => {
    listSavedRoutes().then(setRoutes);
    listLocations().then(setLocations);
  }, []);

  useFocusEffect(reload);

  function placeLabel(id: string): string | undefined {
    return locations.find((l) => l.id === id)?.label;
  }

  // A saved journey outlives the locations it points at — deleting "Work"
  // doesn't delete the trips that went there (§4.3's same rule for the
  // Journeys a route produced). Say so plainly rather than rendering a row
  // that silently won't work.
  function routeSubtitle(route: SavedRoute): string {
    const from = placeLabel(route.originId);
    const to = placeLabel(route.destinationId);
    if (!from || !to) return "A place on this trip has been deleted";
    const stops = route.waypointIds?.length ?? 0;
    const line = defaultRouteLabel(from, to);
    if (stops > 0) return `${line}, ${stops} stop${stops === 1 ? "" : "s"}`;
    // The default label *is* the route, so a journey that was never renamed
    // would otherwise print the same line twice. Fall back to the mode.
    return route.label === line ? `By ${route.preferredMode ?? "walk"}` : line;
  }

  function isUsable(route: SavedRoute): boolean {
    return !!placeLabel(route.originId) && !!placeLabel(route.destinationId);
  }

  function use(route: SavedRoute, intent: PlanIntent) {
    setActive(null);
    // The recency bump belongs to this tap, not to Plan's render — see
    // PlanScreen's note on applying the request during render.
    touchSavedRoute(route.id);
    navigation.navigate("Main", { screen: "Plan", params: { savedRouteId: route.id, intent } });
  }

  async function toggleFavorite(route: SavedRoute) {
    await updateSavedRoute({ ...route, isFavorite: route.isFavorite ? undefined : true });
    reload();
  }

  // The default label the route falls back to when it has no name of its
  // own — the same one Plan gives a newly saved journey. Undefined only if a
  // place on the trip has since been deleted, in which case there's nothing
  // to derive a name from and the existing label has to stand.
  function defaultLabelFor(route: SavedRoute): string | undefined {
    const from = placeLabel(route.originId);
    const to = placeLabel(route.destinationId);
    return from && to ? defaultRouteLabel(from, to) : undefined;
  }

  // Clearing the field is a rename back to the default, not an invalid entry
  // — the journey already has a perfectly good name in its two endpoints, so
  // there's no reason to make the user keep one they've decided against.
  async function saveRename() {
    if (!renaming) return;
    const label = draftLabel.trim() || defaultLabelFor(renaming);
    if (label) await updateSavedRoute({ ...renaming, label });
    setRenaming(null);
    reload();
  }

  function confirmDelete(route: SavedRoute) {
    setActive(null);
    showAlert(`Forget "${route.label}"?`, "The trips you've already planned from it stay in History.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Forget",
        style: "destructive",
        onPress: () => {
          deleteSavedRoute(route.id).then(reload);
        },
      },
    ]);
  }

  if (routes !== null && routes.length === 0) {
    return (
      <ScreenSurface>
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>
            No saved journeys yet — plan a trip and turn on &quot;Save this journey&quot; to reuse it later.
          </Text>
          <AppButton
            label="Plan a journey"
            onPress={() => navigation.navigate("Main", { screen: "Plan" })}
            style={styles.emptyAction}
          />
        </View>
      </ScreenSurface>
    );
  }

  const firstNonFavoriteIndex = (routes ?? []).findIndex((r) => !r.isFavorite);

  return (
    <ScreenSurface>
      <FlatList
        data={routes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const repeats = recurrenceSummary(item);
          return (
            <>
              {/* The same visible seam the Locations list puts under its
                  pinned favourites (§4.3). */}
              {index === firstNonFavoriteIndex && index > 0 && <View style={styles.divider} />}
              {/* The row is a plain View so the star can be a *sibling* of
                  the body's tap target rather than nested inside it —
                  react-native-web renders each Pressable as a <button>, and
                  a button inside a button is invalid HTML that React
                  complains about on every render (the same fix Today's
                  JourneyCard already carries). */}
              <View style={[styles.row, !isUsable(item) && styles.rowStale]}>
                <Pressable
                  onPress={() => setActive(item)}
                  style={styles.rowBody}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}. ${routeSubtitle(item)}${repeats ? `. ${repeats}` : ""}. Double tap for options`}
                >
                  <View style={styles.modeCircle}>
                    <ModeIcon kind={item.preferredMode ?? "walk"} size={16} color={theme.accentWalk} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {routeSubtitle(item)}
                    </Text>
                    {repeats && (
                      <View style={styles.repeatRow}>
                        <ActionIcon kind="repeat" size={12} color={theme.textSecondary} />
                        <Text style={styles.rowMeta}>{repeats}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => toggleFavorite(item)}
                  hitSlop={8}
                  style={styles.starButton}
                  accessibilityRole="button"
                  accessibilityLabel={item.isFavorite ? `Remove ${item.label} from favourites` : `Add ${item.label} to favourites`}
                >
                  <ActionIcon
                    kind="star"
                    size={20}
                    color={item.isFavorite ? theme.favoriteStar : theme.textSecondary}
                    filled={item.isFavorite}
                  />
                </Pressable>
              </View>
            </>
          );
        }}
      />

      {/* Options for one saved journey. The three "use it" actions come
          first and in the order they're wanted: right now is the common
          case, a future time next, repeating last. */}
      <BottomSheet visible={active !== null} onClose={() => setActive(null)} closeLabel="Close journey options">
        {active && (
          <>
            <Text style={styles.sheetTitle}>{active.label}</Text>
            <Text style={styles.sheetSubtitle}>{routeSubtitle(active)}</Text>
            {isUsable(active) ? (
              <View style={styles.sheetActions}>
                <AppButton label="Leave now" onPress={() => use(active, "now")} />
                <AppButton label="Pick a time" variant="secondary" onPress={() => use(active, "schedule")} />
                <AppButton
                  label={active.recurrence ? "Edit repeats" : "Set up repeats"}
                  variant="secondary"
                  onPress={() => use(active, "repeat")}
                />
              </View>
            ) : (
              <Text style={styles.sheetNote}>
                Add the missing place back under Locations, or forget this journey and save a new one.
              </Text>
            )}
            <View style={styles.sheetFooter}>
              <AppButton
                label="Rename"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setDraftLabel(active.label);
                  setRenaming(active);
                  setActive(null);
                }}
              />
              <AppButton label="Forget this journey" variant="danger" size="sm" onPress={() => confirmDelete(active)} />
            </View>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        visible={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename"
        closeLabel="Cancel renaming"
      >
        <TextInput
          style={styles.input}
          value={draftLabel}
          onChangeText={setDraftLabel}
          placeholder={(renaming && defaultLabelFor(renaming)) ?? "Morning commute"}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Journey name, optional. Leave it empty to go back to the route"
          autoFocus
        />
        <View style={styles.renameActions}>
          <AppButton label="Cancel" variant="secondary" layout="inline" onPress={() => setRenaming(null)} />
          <AppButton
            label="Save"
            layout="inline"
            // Only blocked in the one case with no default to fall back
            // on: an empty name for a route whose endpoints are gone.
            disabled={draftLabel.trim().length === 0 && !(renaming && defaultLabelFor(renaming))}
            onPress={saveRename}
          />
        </View>
      </BottomSheet>
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    listContent: {
      padding: SPACING.xl,
      paddingBottom: SPACING.xxl * 2,
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.lg, paddingHorizontal: SPACING.xxl },
    empty: { ...TYPE.body, color: theme.textSecondary, textAlign: "center", lineHeight: 21 },
    emptyAction: { marginTop: SPACING.sm },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: SPACING.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: SPACING.md,
      borderRadius: RADIUS.card,
      backgroundColor: theme.surface,
      marginBottom: SPACING.sm,
      ...cardElevationStyle(theme),
    },
    // Still tappable — the sheet explains what's wrong and offers to forget
    // it — but visibly not something to set off on.
    rowStale: { opacity: 0.6 },
    modeCircle: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.circle,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.bg,
    },
    rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.md },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { ...TYPE.body, fontWeight: "600", color: theme.textPrimary },
    rowMeta: { ...TYPE.caption, color: theme.textSecondary },
    repeatRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
    starButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    // The sheet's own chrome (backdrop, corners, width cap, keyboard inset)
    // lives in BottomSheet now — only the contents are styled here.
    sheetTitle: { ...TYPE.subtitle, color: theme.textPrimary },
    sheetSubtitle: { ...TYPE.caption, color: theme.textSecondary },
    sheetNote: { ...TYPE.caption, color: theme.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
    sheetActions: { gap: SPACING.sm, marginTop: SPACING.md },
    sheetFooter: { gap: SPACING.xs, marginTop: SPACING.lg },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      minHeight: 44,
      ...TYPE.body,
      color: theme.textPrimary,
      backgroundColor: theme.bg,
      marginTop: SPACING.sm,
    },
    renameActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md },
  });
}
