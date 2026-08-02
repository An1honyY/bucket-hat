# Privacy Policy — Bucket Hat

_Last updated: 2026-07-31_

Bucket Hat is a single-user app, and it works entirely on your device by
default: no account, no sign-in, and nothing sent to a server we run. You can
optionally create an account to sync your data between your own devices, in
which case a server we run does hold a copy — see "Where it's stored" for
exactly what that covers. This page explains what the app collects, where it
lives, and who else sees it.

## What we collect

- **Location** — your device's current location (only while the app is open
  and you use it, never in the background), used to set your current
  location as a journey starting point.
- **Saved addresses** — the Home/Work and any other locations you add
  yourself (label, address, latitude/longitude).
- **Your gear inventory** — the clothing, shoes, umbrellas, and vehicles you
  add, including any photos you take or choose for them.
- **Journey history** — the trips you plan, their weather conditions at the
  time, and the gear recommendation given for each one.
- **Feedback you give** — the "too warm / too cold / just right" ratings
  used to calibrate future recommendations to how you personally run warm
  or cold.

We never collect your name. If you don't turn on sync, we collect no email
or account identifier either, because there is no account. If you do turn on
sync, the only thing added is the email address you register with — see
"Where it's stored".

## Where it's stored

Everything above is stored on your device, in a local SQLite database. It
is not encrypted at rest (this is a single-user app, and the data —
home/work addresses and gear inventory — is personal but not
high-sensitivity: no payment details, no linked accounts).

**If you turn on sync**, that same data is also stored on a server we run.
Sync is entirely optional and off until you create an account under
Settings → Sync & account. Without an account, nothing leaves your device
and the app is fully functional.

When sync is on:

- Your gear, saved places, journeys and warmth calibration are copied to a
  Cloudflare D1 database (Cloudflare's hosted SQLite service) so your other
  devices can read them. Cloudflare acts as our hosting provider and does
  not use this data for its own purposes.
- Your **email address and a password hash** are stored there too, because
  an account needs them. The password itself is never stored — only a hash
  that can't be reversed back into it.
- **Gear photos are uploaded** to Cloudflare R2 (object storage) so your
  other devices can show them, and are deleted from the server when you
  delete the gear item they belong to. Photos are taken and stored on
  phones and tablets; the web version doesn't keep its own copy, but does
  display them by loading them from the server while you're signed in.
- **Device preferences are not uploaded** — your theme, 12h/24h choice and
  crash-reporting setting stay local to each device.
- If you ask to reset your password, your **email address is passed to
  Resend**, the service that delivers that one email. It receives nothing
  else — no gear, no journeys — and it's only involved when you ask for a
  reset.
- Your device keeps working normally offline; changes sync when you're back
  online.

Your data is visible only to your own account. Signing out removes the
account credentials from that device and stops syncing; it does not delete
anything, locally or on the server.

There is currently **no in-app "delete my account"** action. If you want
your synced data removed from the server, contact us and we'll delete the
account and everything attached to it. (Your on-device data is unaffected
by that — deleting from Settings, or uninstalling, is what clears it
locally.)

You control your own backups: the **Export my data** action in Settings
bundles your gear, locations, journey history, and calibration state
(including any gear photos) into a single file you choose where to save or
share. **Import data** restores from that same file. Your phone's own
OS-level backup (iCloud/iTunes on iOS, Auto Backup on Android) may also
include this data as part of your regular device backup, the same as any
other app's local data.

## Who else sees it

To do its job, the app sends specific pieces of data to the third-party
services below, and to no one else:

- **Google Routes API** — receives the coordinates of your journey's
  origin, destination, and any stops, to compute a route.
- **Open-Meteo** — receives coordinates and a time, to return a weather
  forecast. Open-Meteo requires no account and needs no personal
  identifier to answer this request.
- **Auckland Transport GTFS Realtime** — receives a route/stop identifier
  to return live bus/train delay information.

- **Cloudflare** — *only if you turn on sync.* Hosts the server that stores
  your synced data, your gear photos, and your account, as described above.
  Unlike the three services above, this one does receive your gear
  inventory, gear photos, and journey history, because storing them for
  your other devices is its entire purpose.

- **Resend** — *only if you ask to reset your password.* Receives your
  email address and the reset message, so it can deliver it. Nothing else
  is sent, and it is not contacted at any other time.

The first three receive only the coordinates and timestamps needed to
answer that specific request — never your gear inventory, journey history,
or feedback. We do not use any advertising network or third-party analytics
SDK, and nothing is sold or shared beyond the requests above.

## Crash reporting

Off by default. No crash-reporting SDK initializes and no data leaves your
device unless you explicitly turn it on, either during onboarding or later
in Settings — and you can turn it back off at any time. When enabled, crash
reports are scrubbed of your saved-location labels and coordinates before
being sent; a stack trace doesn't need your home address to be useful for
fixing a bug.

## Regional scope

v1 is built for Auckland, New Zealand's public transit system and
Southern Hemisphere seasons specifically — it is not intended for use
outside that region.

## Changes to this policy

If what the app collects or who it's shared with changes in a future
version, this page will be updated to match before that version ships.
