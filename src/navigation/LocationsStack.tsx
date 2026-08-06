import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LocationsScreen from "../screens/locations/LocationsScreen";
import LocationDetailScreen from "../screens/locations/LocationDetailScreen";
import LocationFormScreen from "../screens/locations/LocationFormScreen";
import { HeaderLogo, LocalKnowledgeButton } from "./headerParts";
import { backHeaderLeft, themedHeaderOptions } from "./headerOptions";
import useTheme from "../theme/useTheme";
import type { LocationsStackParamList } from "./types";

const Stack = createNativeStackNavigator<LocationsStackParamList>();

// The Locations tab is a stack, not a single screen — see types.ts for why.
// Nested *inside* the tab rather than pushed onto the root stack, so the tab
// bar stays put while you're looking at a location: this is still the
// Locations tab, one level down, not a different place in the app.
export default function LocationsStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...themedHeaderOptions(theme),
        // Labelled with where it goes back to rather than a bare "Back",
        // which is what the tab's own name gives us for free here.
        headerLeft: backHeaderLeft(navigation, "Locations"),
      })}
    >
      <Stack.Screen
        name="LocationsList"
        component={LocationsScreen}
        options={{ title: "Locations", headerLeft: HeaderLogo, headerRight: LocalKnowledgeButton }}
      />
      {/* Title is set by the screen itself, from the location's own name. */}
      <Stack.Screen name="LocationDetail" component={LocationDetailScreen} />
      <Stack.Screen name="LocationForm" component={LocationFormScreen} options={{ title: "Add a location" }} />
    </Stack.Navigator>
  );
}
