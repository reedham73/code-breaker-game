# Code Breaker: The Hacker Challenge

A responsive HTML/CSS/JavaScript PIN deduction game with 50 levels, difficulty bands, attempt history, XP, level map, animations, pop-ups and player progress.

## Important: local demo vs real online accounts
- Without Firebase configuration, the game runs in **local demo mode**. Progress is saved only in the same browser on the same device. It is not secure authentication and does not sync between devices.
- To let people open a shared URL, create accounts, log in later, and continue their progress on another device, configure Firebase Authentication + Firestore and deploy the files to a static host.

## Firebase setup (free tier is usually enough for a small class project)
1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web App to the project and copy its Firebase configuration.
3. In **Authentication → Sign-in method**, enable **Email/Password**.
4. In **Firestore Database**, create a database.
5. Replace the four `PASTE_...` values in `game.js` inside `FIREBASE_CONFIG` with your project's `apiKey`, `authDomain`, `projectId`, and `appId`.
6. Add the following Firestore rules under Firestore → Rules and publish them:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{userId} {
      allow read, create, update: if request.auth != null
                                  && request.auth.uid == userId;
      allow delete: if false;
    }
  }
}
```

These rules ensure each signed-in player can read and update only their own progress document. Never publish the Firebase Admin SDK key or service-account credentials in browser code.

## Deploy and get a shareable link
1. Upload `index.html`, `style.css`, and `game.js` to a static hosting provider such as Netlify or Firebase Hosting.
2. For a quick Netlify deploy, sign in to https://app.netlify.com/drop and drag the extracted project folder (or the three site files) into the deploy area. If using Firebase Auth, add your deployed domain in Firebase Console → Authentication → Settings → Authorized domains.
3. Open the generated HTTPS URL on your phone and test account creation, logout, login, and progress restoration.
4. Share that URL. Each player creates their own account. The same account can resume their saved progress on another device.

## Game rules
- Levels 1–10: Easy, 3-digit PIN, 8 attempts.
- Levels 11–30: Medium, 4-digit PIN, 9 attempts.
- Levels 31–49: Hard, 5-digit PIN, 10 attempts.
- Level 50: Nightmare, 5-digit PIN, 12 attempts and a larger XP reward.
- PIN digits are unique. Feedback dots are shown as: green = correct digit and position, yellow = correct digit but wrong position, grey = digit absent.
- This is a logic game, not a real hacking tool. The random PIN is generated in the browser for each level session.

## Notes / future improvements
The current version saves unlocked level, XP, solved count and player name. The active level's secret and in-progress guesses reset if the page reloads. For a production version, consider saving per-level completion and validating score/progress server-side to prevent cheating.
