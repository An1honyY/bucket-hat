import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MascotBase, { type MascotPose } from "./MascotBase";
import Mascot from "./Mascot";
import { REFERENCE_POSES } from "./poses";
import { MASCOT_ANIMATIONS } from "./states";
import type { MascotState, MascotStateName } from "../../lib/mascot";
import useTheme from "../../theme/useTheme";
import { TYPE, SPACING } from "../../theme/typography";

// TEMPORARY — bench for the mascot. Deleted once the character is settled.

// Every §13.9 state, plus the two compositions that matter: the plain shiver
// (idle + shivering) and the shiver/wind-blown pair the spec says compose.
const STATES: { label: string; state: MascotState }[] = [
  ...(Object.keys(MASCOT_ANIMATIONS) as MascotStateName[]).map((primary) => ({
    label: primary,
    state: { primary, shivering: false },
  })),
  { label: "shiver (idle + shivering)", state: { primary: "idle", shivering: true } },
  { label: "shiver + windBlown", state: { primary: "windBlown", shivering: true } },
];

const FLIPPERS: { label: string; pose: MascotPose }[] = [
  { label: "rest", pose: {} },
  { label: "right +45", pose: { rightFlipperDeg: 45 } },
  { label: "left +45", pose: { leftFlipperDeg: 45 } },
  { label: "both +70", pose: { leftFlipperDeg: 70, rightFlipperDeg: 70 } },
  // The top of the usable range, kept because it is the thing that decided
  // states.ts's numbers: around +90 the flipper stands vertical with its tip
  // tucked behind the hat brim, which is as close to the face as this
  // character gets. Past that the brim swallows the limb — +120 is a stub.
  { label: "right +90", pose: { rightFlipperDeg: 90 } },
  { label: "right +120 — too far", pose: { rightFlipperDeg: 120 } },
  // No inward-swing case. A negative angle folds the flipper against the body
  // and, now that the wings draw over the torso, it slides under the white
  // belly and vanishes. That is right for a limb tucking in, but nothing in
  // §13.9's state table asks for one, so showing it only looked like a bug.
  //
  // Foot lift. The torso must not move with it — that is the whole difference
  // between a tap and a hop, and the reason the feet sit outside the tilt
  // group. Compare each against `rest` above.
  { label: "left foot +4", pose: { leftFootLift: 4 } },
  { label: "right foot +4", pose: { rightFootLift: 4 } },
];

export default function MascotPreview() {
  const theme = useTheme();
  const [greetToken, setGreetToken] = useState(0);
  const label = { ...TYPE.eyebrow, color: theme.textPrimary };
  const note = { ...TYPE.micro, color: theme.textSecondary };

  return (
    // A plain View, not a ScrollView: this renders inside Today's own
    // ScrollView, and a nested one collapses to zero height on web.
    <View style={styles.wrap}>
      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>Character — rebuilt body, redrawn hat</Text>
        <View style={styles.specimens}>
          <MascotBase size={190} />
          <MascotBase size={96} />
          <MascotBase size={64} />
        </View>
      </View>

      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>Flippers — actually separate limbs now</Text>
        <View style={styles.specimens}>
          {FLIPPERS.map(({ label: l, pose }) => (
            <View key={l} style={styles.cell}>
              <MascotBase size={150} pose={pose} />
              <Text style={note}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>States — live, left; reduce-motion fallback, right</Text>
        <Pressable onPress={() => setGreetToken((n) => n + 1)}>
          <Text style={[note, { color: theme.accentWalk }]}>Replay the greeting ({greetToken})</Text>
        </Pressable>
        <View style={styles.specimens}>
          {STATES.map(({ label: stateLabel, state }) => (
            <View key={stateLabel} style={styles.cell}>
              <View style={styles.pair}>
                <Mascot size={215} state={state} greetToken={greetToken} />
                <Mascot size={215} state={state} greetToken={greetToken} reduceMotionOverride />
              </View>
              <Text style={note}>{stateLabel}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.row, { borderColor: theme.border }]}>
        <Text style={label}>States at card size — 96 and 64</Text>
        <View style={styles.specimens}>
          {STATES.map(({ label: stateLabel, state }) => (
            <View key={stateLabel} style={styles.cell}>
              <View style={styles.pair}>
                <Mascot size={96} state={state} />
                <Mascot size={64} state={state} />
              </View>
              <Text style={note}>{stateLabel}</Text>
            </View>
          ))}
        </View>
      </View>

      {REFERENCE_POSES.map(({ key, label: poseLabel, pose }) => (
        <View key={key} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={label}>{poseLabel}</Text>
          <View style={styles.specimens}>
            <MascotBase size={130} pose={pose} />
            <MascotBase size={64} pose={pose} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md, padding: SPACING.sm },
  row: { borderWidth: 1, borderRadius: 14, padding: SPACING.sm, gap: 2 },
  specimens: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: SPACING.md },
  cell: { alignItems: "center" },
  pair: { flexDirection: "row", alignItems: "flex-end" },
});
