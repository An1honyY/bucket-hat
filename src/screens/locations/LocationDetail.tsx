import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { SavedLocation } from "../../types";
import { useRightNow } from "../../lib/useRightNow";
import useTheme from "../../theme/useTheme";
import { useAmbientWeatherStore } from "../../theme/useAmbientWeatherStore";
import useCommonStyles from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";
import RightNowCard from "../today/RightNowCard";
import LocalForecastCard from "../today/LocalForecastCard";
import LocationForm, { type LocationFormValues } from "./LocationForm";
import LocationPreferencesCard from "./LocationPreferencesCard";

// Opening a saved location answers "what's it like there?" before it answers
// "what did I type in when I saved it?" — so this screen leads with the same
// two cards Today shows (Right now + Next 24 hours), pinned to *this*
// location's coordinates rather than wherever the phone is, and puts the
// editable label/address/preferences behind a disclosure.
//
// The cards are the Today components unchanged: a saved location's forecast
// and a current-location forecast are the same question asked about different
// coordinates, so they should not be two divergent card designs.
//
// While this screen is open the *whole app* takes this location's weather
// mood, not just its cards — background, sky, header and tab bar included —
// by publishing the reading as useAmbientWeatherStore's override. Tinting only
// the cards left them looking like two blue rectangles pasted onto someone
// else's warm screen; the mood is meant to say "this is what it's like
// there", and half a screen can't say that. See DECISIONS.md 2026-08-06.
interface Props {
  location: SavedLocation;
  onSubmit: (values: LocationFormValues) => void;
  onDelete: () => void;
}

export default function LocationDetail({ location, onSubmit, onDelete }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const common = useCommonStyles();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Pinned to this location's coordinates — useRightNow compares them by
  // value, so typing in the form below doesn't retrigger the fetch.
  const outlook = useRightNow({ lat: location.lat, lng: location.lng });

  const setMoodOverride = useAmbientWeatherStore((s) => s.setMoodOverride);
  // Released on *blur*, not on unmount alone. Unmount only fires when this
  // route is popped; switching to another tab leaves it mounted, and the app
  // would have stayed painted in this suburb's mood over a screen that has
  // nothing to do with it. (Popping blurs too, so this covers both.)
  //
  // The null-then-set when the forecast refreshes never reaches the screen:
  // the driver reads the store through React, so both writes land in one
  // render and only the final mood starts a fade.
  useFocusEffect(
    useCallback(() => {
      if (outlook.weather) setMoodOverride(outlook.weather);
      return () => setMoodOverride(null);
    }, [outlook.weather, setMoodOverride])
  );

  return (
    <ScrollView
      contentContainerStyle={common.scrollContent}
      refreshControl={
        <RefreshControl refreshing={outlook.refreshing} onRefresh={outlook.refresh} tintColor={theme.textSecondary} />
      }
    >
      <View style={styles.heading}>
        <Text style={styles.label} accessibilityRole="header">
          {location.label}
        </Text>
        <Text style={styles.address}>{location.address}</Text>
      </View>

      <RightNowCard {...outlook} />

      <LocalForecastCard
        suburb={outlook.suburb}
        hourly={outlook.hourly}
        daily={outlook.daily}
      />

      <LocationPreferencesCard location={location} />

      {/* Same disclosure pattern as the form's own "Advanced" row and
          Settings' threshold overrides — collapsed by default, because the
          details behind it are the thing you set once and the cards above are
          the thing you come back for. */}
      <Pressable
        onPress={() => setDetailsOpen((v) => !v)}
        style={styles.disclosureRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsOpen }}
        accessibilityLabel={detailsOpen ? "Hide location and preferences" : "Edit location and preferences"}
      >
        <Text style={styles.disclosure}>{detailsOpen ? "▾" : "▸"} Location &amp; preferences</Text>
      </Pressable>

      {detailsOpen && (
        <LocationForm
          embedded
          initial={location}
          // Saving collapses the section, so the cards above — which now
          // reflect what was just saved — are what you're left looking at.
          onSubmit={(values) => {
            setDetailsOpen(false);
            onSubmit(values);
          }}
          onCancel={() => setDetailsOpen(false)}
          onDelete={onDelete}
        />
      )}
    </ScrollView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    heading: { marginBottom: SPACING.lg },
    label: { ...TYPE.title, fontWeight: "600", color: theme.textPrimary },
    address: { ...TYPE.caption, color: theme.textSecondary, marginTop: 2 },
    disclosureRow: { minHeight: 44, justifyContent: "center" },
    disclosure: { ...TYPE.caption, fontWeight: "600", color: theme.textPrimary },
  });
}
