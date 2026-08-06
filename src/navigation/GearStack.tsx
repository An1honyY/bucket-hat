import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GearScreen from "../screens/gear/GearScreen";
import GearItemScreen, { gearItemTitle } from "../screens/gear/GearItemScreen";
import { HeaderLogo } from "./headerParts";
import { backHeaderLeft, themedHeaderOptions } from "./headerOptions";
import useTheme from "../theme/useTheme";
import type { GearStackParamList } from "./types";

const Stack = createNativeStackNavigator<GearStackParamList>();

// The Gear tab is a stack, not a single screen — see types.ts for why, and
// LocationsStack.tsx for why it's nested inside the tab rather than pushed
// onto the root stack.
export default function GearStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...themedHeaderOptions(theme),
        headerLeft: backHeaderLeft(navigation, "Gear"),
      })}
    >
      <Stack.Screen
        name="GearList"
        component={GearScreen}
        options={{ title: "Gear", headerLeft: HeaderLogo }}
      />
      <Stack.Screen
        name="GearItem"
        component={GearItemScreen}
        options={({ route }) => ({ title: gearItemTitle(route.params) })}
      />
    </Stack.Navigator>
  );
}
