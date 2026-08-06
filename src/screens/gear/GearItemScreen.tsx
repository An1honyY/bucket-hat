import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createClothing, deleteClothing, updateClothing } from "../../db/repositories/clothing";
import { createShoe, deleteShoe, updateShoe } from "../../db/repositories/shoes";
import { createUmbrella, deleteUmbrella, updateUmbrella } from "../../db/repositories/umbrellas";
import { createVehicle, deleteVehicle, updateVehicle } from "../../db/repositories/vehicles";
import ScreenSurface from "../../components/ScreenSurface";
import UnavailabilitySheet from "../../components/UnavailabilitySheet";
import ClothingForm from "./ClothingForm";
import ShoeForm from "./ShoeForm";
import UmbrellaForm from "./UmbrellaForm";
import VehicleForm from "./VehicleForm";
import type { GearStackParamList } from "../../navigation/types";

// The add/edit form for one piece of gear, as a route on the Gear tab's stack
// (GearStack.tsx). All four kinds share it: the lists differed only in which
// repository and form component they used, and four copies of "which mode am
// I in, and what does Cancel do" was four places for the back behaviour to
// drift.
//
// Each list used to render its own form in place of itself, from `useState`.
// Nothing about that was reachable by the system back gesture, and Cancel was
// the only way out — see DECISIONS.md 2026-08-06.
type Props = NativeStackScreenProps<GearStackParamList, "GearItem">;

const TITLE: Record<GearStackParamList["GearItem"]["kind"], { add: string; edit: string }> = {
  clothing: { add: "Add clothing", edit: "Edit clothing" },
  shoe: { add: "Add shoes", edit: "Edit shoes" },
  umbrella: { add: "Add umbrella", edit: "Edit umbrella" },
  vehicle: { add: "Add vehicle", edit: "Edit vehicle" },
};

export function gearItemTitle(params: GearStackParamList["GearItem"]): string {
  return params.item ? TITLE[params.kind].edit : TITLE[params.kind].add;
}

export default function GearItemScreen({ route, navigation }: Props) {
  const params = route.params;
  // Owned locally from the route param onward: marking an item unavailable
  // writes and then re-renders the form with the saved values, without
  // leaving the screen.
  const [item, setItem] = useState(params.item);
  const [unavailabilityOpen, setUnavailabilityOpen] = useState(false);

  // The list behind reloads on focus, so every path out of here is just a pop.
  const close = () => navigation.goBack();

  if (params.kind === "clothing") {
    const current = item as typeof params.item;
    return (
      <ScreenSurface>
        <ClothingForm
          initial={current}
          initialType={params.presetType}
          onSubmit={async (next) => {
            await (current ? updateClothing(next) : createClothing(next));
            close();
          }}
          onCancel={close}
          onDelete={current ? async () => { await deleteClothing(current.id); close(); } : undefined}
          onMarkUnavailable={current ? () => setUnavailabilityOpen(true) : undefined}
        />
        {current && unavailabilityOpen && (
          <UnavailabilitySheet
            initialReason={current.unavailableReason}
            onClose={() => setUnavailabilityOpen(false)}
            onConfirm={({ unavailableUntil, unavailableReason }) => {
              // Marking something as in the laundry is also what resets its
              // wear count (§7.16) — the other reasons leave it alone.
              const laundryReset = unavailableReason === "laundry" ? { wearsSinceClean: 0, needsCleaning: false } : {};
              const updated = { ...current, unavailableUntil, unavailableReason, ...laundryReset };
              updateClothing(updated).then(() => setItem(updated));
            }}
          />
        )}
      </ScreenSurface>
    );
  }

  if (params.kind === "shoe") {
    const current = item as typeof params.item;
    return (
      <ScreenSurface>
        <ShoeForm
          initial={current}
          onSubmit={async (next) => {
            await (current ? updateShoe(next) : createShoe(next));
            close();
          }}
          onCancel={close}
          onDelete={current ? async () => { await deleteShoe(current.id); close(); } : undefined}
          onMarkUnavailable={current ? () => setUnavailabilityOpen(true) : undefined}
        />
        {current && unavailabilityOpen && (
          <UnavailabilitySheet
            initialReason={current.unavailableReason}
            onClose={() => setUnavailabilityOpen(false)}
            onConfirm={({ unavailableUntil, unavailableReason }) => {
              const laundryReset = unavailableReason === "laundry" ? { wearsSinceClean: 0, needsCleaning: false } : {};
              const updated = { ...current, unavailableUntil, unavailableReason, ...laundryReset };
              updateShoe(updated).then(() => setItem(updated));
            }}
          />
        )}
      </ScreenSurface>
    );
  }

  if (params.kind === "umbrella") {
    const current = item as typeof params.item;
    return (
      <ScreenSurface>
        <UmbrellaForm
          initial={current}
          onSubmit={async (next) => {
            await (current ? updateUmbrella(next) : createUmbrella(next));
            close();
          }}
          onCancel={close}
          onDelete={current ? async () => { await deleteUmbrella(current.id); close(); } : undefined}
          onMarkUnavailable={current ? () => setUnavailabilityOpen(true) : undefined}
        />
        {current && unavailabilityOpen && (
          // UmbrellaItem has no unavailableReason field (§3) — only the
          // return date is persisted here, unlike clothing/shoes.
          <UnavailabilitySheet
            onClose={() => setUnavailabilityOpen(false)}
            onConfirm={({ unavailableUntil }) => {
              const updated = { ...current, unavailableUntil };
              updateUmbrella(updated).then(() => setItem(updated));
            }}
          />
        )}
      </ScreenSurface>
    );
  }

  const current = item as typeof params.item;
  return (
    <ScreenSurface>
      <VehicleForm
        initial={current}
        onSubmit={async (next) => {
          await (current ? updateVehicle(next) : createVehicle(next));
          close();
        }}
        onCancel={close}
        onDelete={current ? async () => { await deleteVehicle(current.id); close(); } : undefined}
      />
    </ScreenSurface>
  );
}
