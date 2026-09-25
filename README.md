# HabitFlow

An offline-first habit tracker for Android (and iOS), built with Expo SDK 57, Expo Router and TypeScript. It implements the **HabitFlow v4** design from `design/project/HabitFlow v4.dc.html` on the **Nocturne** design system (`design/project/_ds/nocturne-*/`).

All data stays on the device. There's no account, no server and no network access for any core feature.

## Running it

```bash
npm install
npm test            # domain tests (streaks, grace days, insights, goals)
npm run typecheck
npm run lint

npx expo start --web          # quickest look — sample data is one tap away on the welcome screen
npm run android               # development build on a device/emulator (expo run:android)
```

The app needs a **development build**; Expo Go won't work. Home-screen widgets (`react-native-android-widget`) and notification action buttons that run in the background (`expo-task-manager`) both ship native code. Use `npm run android` locally, or `npx eas-cli@latest build --profile development`.

On the first launch, "Or explore with six months of sample data" loads the prototype's ten habits, routines and goals. The data is generated relative to today, so every chart has real history to draw.

## What's where

```
src/
  app/                 Expo Router screens (one file per route)
    (tabs)/            Today · Routines · Insights · You — the four-tab IA from the design
    habit/[id].tsx     habit detail: stats, 26-week heatmap, weekday + trend charts, notes, history
    habit/form.tsx     create / edit (progressive disclosure under "More options")
    timer.tsx          duration habits — real time, survives the screen turning off
    routine/…          routine detail (reorder), new routine, step-by-step run + summary
    goals, goal/[id], achievements, history, search, review, archived
    settings/…         appearance, reminders, streaks & rewards, data & backup
    welcome.tsx        splash + 4-step onboarding (with Skip)
    start/[id].tsx     deep link used by the Today widget's ▶ button
  domain/              pure TypeScript, no React — unit-tested
    status.ts          the one place a day's status is decided (done/partial/skipped/missed/off)
                       + streaks with grace days, momentum, schedule versions
    insights.ts        every Insights/detail chart and the correlation finder
    goals.ts           goal progress, pace, ETA, achievements
    sample.ts          sample data (ported from the prototype's seeding)
  store/
    data.ts            zustand store persisted to AsyncStorage, with an append-only op log
    actions.ts         user actions; screens, notifications and widgets all go through these
    ui.ts              sheet / dialog / undo snackbar / milestone state
  components/          Nocturne primitives (ui.tsx), charts, Today rows, overlays
  services/            notifications (Done/Snooze/Skip), backup/export/restore, sync hooks
  widgets/             Today, Progress, Streaks and Quick add home-screen widgets
  theme/               Nocturne tokens → dark/light palettes × Blurple/Lilac/Slate accents
```

## Design → implementation notes

- **Tokens:** every colour comes from the Nocturne ramps in `src/theme/tokens.ts`. `palette.ts` mirrors the prototype's `[data-hf]` variables (`--bg`, `--sf`, `--ac`, `--acx`, `--act` and the rest). CSS `color-mix()` is reproduced by `theme/color.ts`.
- **Signature details:** the fading 48px rules (`<Rule>`), the `--card` top-to-bottom shade (`<Card>`) and the glowing gradient bars (`<GlowFill>`/`<Bar>`, via RN `boxShadow`) are all carried over. So are the diamond→square check box that springs upright, bead and quartered-track progress, the solid FAB, and the pill tab indicator.
- **Status is never colour alone:** filled = done, half-filled = partial, dashed = skipped, struck through = missed, striped = covered by a grace day (`charts.tsx › cellShapes`).
- **Type:** Inter 300/400/500/600 via `@expo-google-fonts/inter`, with the design's sizes and letter-spacing.
- **Tweaks panel → settings:** the prototype's tweaks are real settings now. *Today layout* (List/Grid) and *Completion feel* (Controls/Fill row) live under Appearance; *Recovery model* (Grace days/Momentum) lives under Streaks & rewards.

### Where it deliberately differs from the prototype

- **Real data:** the prototype hard-coded "Friday, Sep 25" and fixed streak numbers. Here, streaks, rates, goals and achievements are computed from the check-in log, so some sample numbers differ from the mockup. For example, grace days make some best streaks longer.
- **Timer:** runs in real time instead of 60×. "+5 min" extends this session only, rather than permanently changing the habit's target. Closing the timer pauses it, and Today shows *Resume*.
- **Goals:** fed automatically by a habit (pages → books, minutes → hours, steps). The design has no goal-creation screen, so goals come with the sample data only.
- **Stacking picker:** chips instead of a web `<select>`.
- **Milestone screen:** has no "Save card" button (it would need an image-export dependency). "+100 XP · Achievement unlocked" appears, and is actually awarded, only the first time a 30-day streak is reached.
- **The prototype's frame:** the journeys sidebar and the side-by-side home-screen phone were demo scaffolding. The widgets and notification are real Android features instead.

## Profile and Google Drive sync

**You → Profile & sync** holds your name, age, gender and a few stats. Signing in with Google is optional. It exists only to keep a copy of your progress in your own Google Drive:

- HabitFlow asks for the `drive.appdata` scope only. That's a private, hidden app folder in your Drive; the app can't see your other files, email or contacts.
- Sync **merges** rather than overwrites. Check-ins, habits, routines, goals and reviews from both sides are combined, and when the same thing changed on both, the newer edit wins. Deleted habits stay deleted.
- It runs on launch, when you leave the app, and about 20 seconds after a change. You can turn auto-sync off or press **Sync now**. With no connection the app works exactly as before and syncs later.
- Signing out keeps everything on the phone. **Delete Drive copy** and **Erase this phone** are separate, confirmed actions.

### One-time Google setup (needed before sign-in works)

Google only lets a signed app use sign-in when it's registered, so this part has to be done in your Google account:

1. Go to https://console.cloud.google.com and create a project (e.g. *HabitFlow*).
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **Google Auth Platform → Branding / OAuth consent screen**: choose *External*, then enter an app name and your email.
   - Under **Data access**, add the scope `.../auth/drive.appdata`.
   - Under **Audience**, add your Gmail address as a **test user**. While the app is in *Testing*, only test users can sign in.
4. Get your app's signing fingerprint by running `npx eas-cli@latest credentials -p android`, choosing the profile you build with (e.g. `preview`), and copying the **SHA-1**.
5. **Credentials → Create credentials → OAuth client ID → Android**:
   - Package name: `app.habitflow`
   - SHA-1: the value from step 4

   If you build with more than one keystore, add one Android client per SHA-1.
6. Rebuild the APK. No code or config change is needed, because Google matches the app by package name and SHA-1.

If sign-in shows **DEVELOPER_ERROR**, the SHA-1 or package name in step 5 doesn't match the installed build.

## Offline-first and future sync

Every write goes through `useData.commit(op, payload, fn)`, which also appends to `ops`, an append-only operation log capped at 2,000 entries. A future sync layer can replay it without any screen changing. Backups (`.hfbak`) and exports (JSON/CSV) are written to the app's documents folder. Restoring takes a backup of the current data first and refuses files written by a newer app version.
