import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createLocation } from "../../db/repositories/locations";
import ScreenSurface from "../../components/ScreenSurface";
import LocationForm, { type LocationFormValues } from "./LocationForm";
import type { LocationsStackParamList } from "../../navigation/types";

// The "add a location" route. Editing an existing one happens inside
// LocationDetailScreen's disclosure instead — see LocationDetail's header
// comment for why the forecast, not the form, leads that screen.
type Props = NativeStackScreenProps<LocationsStackParamList, "LocationForm">;

export default function LocationFormScreen({ navigation }: Props) {
  async function handleSubmit(values: LocationFormValues) {
    await createLocation(values);
    // The list reloads on focus, so popping is all this has to do.
    navigation.goBack();
  }

  return (
    <ScreenSurface>
      <LocationForm onSubmit={handleSubmit} onCancel={() => navigation.goBack()} />
    </ScreenSurface>
  );
}
