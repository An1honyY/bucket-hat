import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ClothingList from "./ClothingList";
import ShoeList from "./ShoeList";
import UmbrellaList from "./UmbrellaList";
import ScreenSurface from "../../components/ScreenSurface";
import VehicleList from "./VehicleList";
import useTheme from "../../theme/useTheme";
import { CONTENT_MAX_WIDTH } from "../../theme/commonStyles";
import { SPACING, TYPE } from "../../theme/typography";

// Inventory manager tab, sub-tabbed by Vehicles/Clothing/Shoes/Umbrellas —
// docs/04-screens-navigation.md item 4. Full add/edit/delete per sub-tab
// (Phase 2), with the add/edit form now a pushed route on the Gear stack
// rather than a mode of the list (GearItemScreen).
//
// §9.6's "add the missing item" links from Journey Detail used to arrive
// here as a route param this screen had to consume and forward down to the
// right list. They navigate straight to the GearItem route instead, so
// there's no param to thread, no one-render window to catch it in, and no
// risk of the form reopening when the tab is focused again.
const SUB_TABS = ["Vehicles", "Clothing", "Shoes", "Umbrellas"] as const;
type SubTab = (typeof SUB_TABS)[number];

export default function GearScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [activeTab, setActiveTab] = useState<SubTab>("Clothing");

  return (
    <ScreenSurface>
      <View style={styles.tabBar}>
        {SUB_TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
      {activeTab === "Clothing" && <ClothingList />}
      {activeTab === "Shoes" && <ShoeList />}
      {activeTab === "Umbrellas" && <UmbrellaList />}
      {activeTab === "Vehicles" && <VehicleList />}
    </ScreenSurface>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // §9.6 — the sub-tab strip is the first control on this screen and was
    // the one place a tap target depended entirely on its text height.
    tabBar: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      width: "100%",
      maxWidth: CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
    tabButton: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: SPACING.xs },
    tabButtonActive: { borderBottomWidth: 2, borderBottomColor: theme.accentWalk },
    tabLabel: { ...TYPE.caption, color: theme.textSecondary },
    tabLabelActive: { color: theme.accentWalk, fontWeight: "700" },
  });
}
