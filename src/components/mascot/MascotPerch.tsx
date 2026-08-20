import type { ReactNode } from "react";
import type { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { PerchRooms } from "./useMascotPerches";

// The wrapper around one card the mascot can stand on. Spread `perchProps(n)`
// onto it and give it the card as a child.
//
// It exists as a component rather than as a style the hook hands back because
// of *who re-renders*. The room a perch reserves has to animate, and an
// animated style has to come from a `useAnimatedStyle` — one per perch, since
// each has to know whether it is the one being stood on. Hooks can't be called
// in a loop, so the per-perch hook lives in a per-perch component.
//
// The payoff is that the settle costs no React work at all. The hook writes
// three Reanimated values and the scroll offset in one synchronous block, and
// every perch on the screen re-reads them on the UI thread. Routing this
// through state instead cost a 75ms render on the frame the stack started
// moving — a quarter of the settle skipped, which is exactly what "jolt" felt
// like.
export interface MascotPerchProps {
  index: number;
  rooms: PerchRooms;
  perchRef: (node: View | null) => void;
  onLayout: () => void;
  children: ReactNode;
}

export default function MascotPerch({ index, rooms, perchRef, onLayout, children }: MascotPerchProps) {
  const { routing, arrivingRoom, leavingRoom } = rooms;
  const style = useAnimatedStyle(() => {
    const { active, leaving } = routing.value;
    if (index === active) return { marginTop: arrivingRoom.value };
    if (index === leaving) return { marginTop: leavingRoom.value };
    return { marginTop: 0 };
  });

  return (
    <Animated.View ref={perchRef} onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}
