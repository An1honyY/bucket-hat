import { useLayoutEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { deleteLocation, updateLocation } from "../../db/repositories/locations";
import ScreenSurface from "../../components/ScreenSurface";
import LocationDetail from "./LocationDetail";
import type { LocationFormValues } from "./LocationForm";
import type { LocationsStackParamList } from "../../navigation/types";

// Route wrapper for one saved location — owns the persistence and the header
// title; LocationDetail itself owns the layout.
//
// Was a `useState` mode of LocationsScreen. As a route the way out is the
// stack's own back control and the system back gesture, and popping it
// unmounts the screen, which is what releases the app-wide weather mood
// override it holds while open (§9.1.3).
type Props = NativeStackScreenProps<LocationsStackParamList, "LocationDetail">;

export default function LocationDetailScreen({ route, navigation }: Props) {
  // Seeded from the route param and owned from then on: saving updates what's
  // on screen in place rather than bouncing back to the list, so a saved note
  // or gear pick is visibly there. The list behind reloads on focus.
  const [location, setLocation] = useState(route.params.location);

  useLayoutEffect(() => {
    navigation.setOptions({ title: location.label });
  }, [location.label, navigation]);

  async function handleSubmit(values: LocationFormValues) {
    const updated = { ...location, ...values };
    await updateLocation(updated);
    setLocation(updated);
  }

  async function handleDelete() {
    await deleteLocation(location.id);
    navigation.goBack();
  }

  return (
    <ScreenSurface>
      <LocationDetail location={location} onSubmit={handleSubmit} onDelete={handleDelete} />
    </ScreenSurface>
  );
}
