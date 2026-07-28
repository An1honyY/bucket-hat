// Resolves what a gear photo should actually render from — see
// src/lib/sync/remotePhotoCache.ts for the web/native split.
//
// Native: the local file `photoUri` already names. Web: the account's
// copy in object storage, fetched on demand, since the web build has no
// local photo storage at all.
import { useEffect, useState } from "react";
import { getRemotePhotoUri, isRemotePhotoRenderingSupported } from "../lib/sync/remotePhotoCache";

// The resolved URL is stored with the id it belongs to, rather than reset
// to undefined whenever the id changes. Resetting would mean a state write
// during the effect on every prop change (cascading renders), and it would
// still leave a window where a recycled list row rendered the previous
// item's photo. Comparing ids at read time closes both.
interface Resolved {
  itemId: string;
  uri: string | undefined;
}

export function useGearPhoto(itemId: string | undefined, photoUri: string | undefined): string | undefined {
  const [resolved, setResolved] = useState<Resolved | undefined>(undefined);

  // A local path always wins — it's already on disk, so there's no reason
  // to spend a request, and on native it's the only option available.
  const needsRemote = !photoUri && Boolean(itemId) && isRemotePhotoRenderingSupported();

  useEffect(() => {
    if (!needsRemote || !itemId) return;
    let active = true;
    getRemotePhotoUri(itemId).then((uri) => {
      if (active) setResolved({ itemId, uri });
    });
    return () => {
      active = false;
    };
  }, [itemId, needsRemote]);

  if (photoUri) return photoUri;
  // Checked explicitly rather than with `resolved?.itemId === itemId`:
  // when both sides are undefined that comparison is true, and the
  // property read that followed would throw.
  if (!resolved || resolved.itemId !== itemId) return undefined;
  return resolved.uri;
}
