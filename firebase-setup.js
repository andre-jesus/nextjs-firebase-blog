/*
  Firebase Setup Helper Script
  
  Usage:
  1. Make sure you have Firebase CLI installed: npm install -g firebase-tools
  2. Login to Firebase: firebase login
  3. Run this script: node firebase-setup.js
  
  This script will:
  - Initialize Firebase if needed
  - Set up CORS for Firebase Storage
  - Deploy Firestore and Storage rules
*/

const { execSync } = require('child_process');
const fs = require('fs');

// Check if Firebase CLI is installed
try {
  console.log('Checking Firebase CLI installation...');
  execSync('firebase --version', { stdio: 'inherit' });
} catch (error) {
  console.error('Firebase CLI is not installed. Please install it with: npm install -g firebase-tools');
  process.exit(1);
}

// Check if user is logged in
try {
  console.log('Checking Firebase login status...');
  execSync('firebase projects:list', { stdio: 'inherit' });
} catch (error) {
  console.error('You are not logged in to Firebase. Please run: firebase login');
  process.exit(1);
}

// Ensure Firebase is initialized
if (!fs.existsSync('.firebaserc')) {
  console.log('Initializing Firebase...');
  try {
    execSync('firebase init firestore storage', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    process.exit(1);
  }
}

// Deploy Firestore rules
console.log('Deploying Firestore rules...');
try {
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to deploy Firestore rules:', error);
}

// Deploy Storage rules
console.log('Deploying Storage rules...');
try {
  execSync('firebase deploy --only storage', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to deploy Storage rules:', error);
}

// Set up CORS for Storage
console.log('Setting up CORS for Firebase Storage...');
try {
  execSync('firebase storage:cors set cors.json', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to set CORS rules for Storage:', error);
}

console.log('Firebase setup complete! Your blog should now work properly.');
console.log('');
console.log('If you still encounter issues, make sure you have:');
console.log('1. Enabled Authentication in the Firebase Console');
console.log('2. Enabled Email/Password authentication');
console.log('3. Created a test user account');
console.log('4. Updated your .env.local file with the correct Firebase configuration');
