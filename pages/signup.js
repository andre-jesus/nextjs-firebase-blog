import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserProfile } from '../lib/models/userModel';
import Head from 'next/head';
import Link from 'next/link';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Get account type from query parameters or default to 'user'
  const { type = 'user' } = router.query;
  const [accountType, setAccountType] = useState(type);

  // Update account type when the query param changes
  useEffect(() => {
    if (router.query.type) {
      setAccountType(router.query.type);
    }
  }, [router.query.type]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore with account type
      await createUserProfile(user.uid, {
        displayName: name,
        email: email,
        photoURL: null,
        createdAt: null, // Will be set by the server
        lastActive: null, // Will be set by the server
        isVenueAccount: accountType === 'venue', // Set based on selected account type
      });

      // Redirect based on account type
      if (accountType === 'venue') {
        router.push('/events'); // Venue manager dashboard
      } else {
        router.push('/map'); // Regular user map view
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please use a different email or log in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check your email format.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(error.message || 'An error occurred during signup. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | Happen</title>
      </Head>
      
      <div className="max-w-md mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Sign Up</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup}>
          {/* Account type selection */}
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
            <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
              <button 
                type="button"
                className={`flex-1 py-2 ${
                  accountType === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setAccountType('user')}
              >
                Event-goer
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 ${
                  accountType === 'venue' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setAccountType('venue')}
              >
                Venue Manager
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {accountType === 'venue' 
                ? 'Create an account to manage venues and events' 
                : 'Create an account to discover and attend events'}
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="name">
              {accountType === 'venue' ? 'Full Name' : 'Name'}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              minLength="6"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              minLength="6"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-gray-700 dark:text-gray-300">
          <p>
            Already have an account?{' '}
            <Link href={`/login?type=${accountType}`} className="text-blue-600 dark:text-blue-400 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}