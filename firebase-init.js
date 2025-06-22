// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your actual Firebase project configuration (REPLACE WITH YOUR VALUES)
const firebaseConfig = {
  apiKey: "AIzaSyAIBcfTKrasIj3X3LnJXRfj2oTSu_YKtJ8",
  authDomain: "synappse-client-meetings.firebaseapp.com",
  projectId: "synappse-client-meetings",
  storageBucket: "synappse-client-meetings.firebasestorage.app",
  messagingSenderId: "336007243846",
  appId: "1:336007243846:web:baba5edc6b5d07f50fc247",
  measurementId: "G-EZ79B24S00"
};

// Use the appId directly from your firebaseConfig
const appId = firebaseConfig.appId;

let app;
let db;
let auth;
let userId = 'anonymous_initializing'; // Initial state for debugging

console.log("firebase-init.js: Script started.");

// Check if firebaseConfig has necessary details to proceed
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("firebase-init.js: Firebase config is incomplete or invalid. Cannot initialize Firebase.");
    const firebaseStatusElement = document.getElementById('firebaseStatus');
    if (firebaseStatusElement) {
        firebaseStatusElement.textContent = 'Firebase Config Missing or Invalid.';
        firebaseStatusElement.classList.remove('text-green-500', 'text-yellow-500');
        firebaseStatusElement.classList.add('text-red-500');
    }
} else {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("firebase-init.js: Firebase app, auth, db initialized.");

        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("firebase-init.js: onAuthStateChanged - User IS signed in. UID:", userId);
            } else {
                console.log("firebase-init.js: onAuthStateChanged - User NOT signed in. Attempting anonymous sign-in.");
                try {
                    const userCredential = await signInAnonymously(auth);
                    userId = userCredential.user.uid;
                    console.log("firebase-init.js: Successfully signed in anonymously. UID:", userId);
                } catch (error) {
                    console.error("firebase-init.js: Anonymous sign-in failed!", error);
                    userId = 'anonymous_failed'; // Indicate anonymous sign-in failed
                }
            }

            // Expose Firebase objects globally for the main script to use
            window.db = db;
            window.auth = auth;
            window.userId = userId;
            window.appId = appId;
            window.Timestamp = Timestamp;
            console.log("firebase-init.js: Global window variables set.");

            // Update the Firebase status indicator on the HTML page
            const firebaseStatusElement = document.getElementById('firebaseStatus');
            if (firebaseStatusElement) {
                if (userId && userId !== 'anonymous_initializing' && userId !== 'anonymous_failed') {
                    firebaseStatusElement.textContent = `Firebase Connected: User ID ${userId}`;
                    firebaseStatusElement.classList.remove('text-red-500', 'text-yellow-500');
                    firebaseStatusElement.classList.add('text-green-500');
                } else if (userId === 'anonymous_failed') {
                    firebaseStatusElement.textContent = 'Firebase Auth Failed. Check Console.';
                    firebaseStatusElement.classList.remove('text-green-500', 'text-yellow-500');
                    firebaseStatusElement.classList.add('text-red-500');
                } else {
                    firebaseStatusElement.textContent = 'Firebase Connected: Anonymous User'; // Fallback for anonymous success
                    firebaseStatusElement.classList.remove('text-red-500', 'text-yellow-500');
                    firebaseStatusElement.classList.add('text-green-500');
                }
            }
        });
    } catch (initError) {
        console.error("firebase-init.js: Error during Firebase initialization outside onAuthStateChanged!", initError);
        const firebaseStatusElement = document.getElementById('firebaseStatus');
        if (firebaseStatusElement) {
            firebaseStatusElement.textContent = 'Firebase Initialization Error.';
            firebaseStatusElement.classList.remove('text-green-500', 'text-yellow-500');
            firebaseStatusElement.classList.add('text-red-500');
        }
    }
}
