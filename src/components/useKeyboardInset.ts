import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// How much of the screen the software keyboard is currently covering.
//
// React Native's KeyboardAvoidingView is the usual answer, but it measures
// its own layout against the window, and inside a <Modal> that measurement is
// wrong on Android: the modal is a separate window that `adjustResize` never
// resizes, so a bottom-anchored sheet stays put and the keyboard slides over
// the top of it. Reading the keyboard's reported height directly and turning
// it into padding sidesteps the layout question — the sheet is lifted by
// exactly the number of pixels the keyboard occupies, on both platforms.
//
// Web returns 0 and never subscribes: RNW emits no keyboard events, and a
// mobile browser handles an obscured input itself by scrolling to it.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;
    // iOS fires the "will" pair ahead of the animation, so the sheet moves
    // *with* the keyboard rather than snapping into place after it. Android
    // only ever fires the "did" pair.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => setInset(event.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
