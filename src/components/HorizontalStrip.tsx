import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

// A horizontally scrolling row of forecast columns.
//
// On native this is just a horizontal ScrollView — a swipe does the obvious
// thing and the platform draws its own transient indicator. The web build
// needs real work to reach parity, which is why this is a platform-split
// component rather than a bare ScrollView at each call site; see
// HorizontalStrip.web.tsx for what desktop browsers get wrong.
interface Props {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Style for the scroll container itself, not its content — used to cancel
   *  a card's padding so the strip can bleed to its edges. */
  style?: StyleProp<ViewStyle>;
}

export default function HorizontalStrip({ children, contentContainerStyle, style }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );
}
