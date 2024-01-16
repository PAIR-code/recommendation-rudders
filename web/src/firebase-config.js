/**
 * To find your Firebase config object:
 * 
 * 1. Go to your [Project settings in the Firebase console](https://console.firebase.google.com/project/_/settings/general/)
 * 2. In the "Your apps" card, select the nickname of the app for which you need a config object.
 * 3. Select Config from the Firebase SDK snippet pane.
 * 4. Copy the config object snippet, then add it here.
 */
const config = {
  apiKey: "ADD_API_KEY_HERE",
  authDomain: "friendlychat-d6dc5.firebaseapp.com",
  projectId: "friendlychat-d6dc5",
  storageBucket: "friendlychat-d6dc5.appspot.com",
  messagingSenderId: "550311295925",
  appId: "1:550311295925:web:cad179f7e3f9c390d5f7fc"
};

export function getFirebaseConfig() {
  if (!config || !config.apiKey) {
    throw new Error('No Firebase configuration object provided.' + '\n' +
    'Add your web app\'s configuration object to firebase-config.js');
  } else {
    return config;
  }
}