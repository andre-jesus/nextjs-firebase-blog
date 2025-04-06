import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile } from '../lib/models/userModel';
import Head from 'next/head';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const router = useRouter();
  
  // Get account type from query parameters or default to 'user'
  const { type = 'user' } = router.query;
  const [accountType, setAccountType] = useState(type);

  // Set account type when query param changes
  useEffect(() => {
    if (router.query.type) {
      setAccountType(router.query.type);
    }
  }, [router.query.type]);

  // Check if Firebase config is loaded properly
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      try {
        // Display Firebase auth config status
        setDebugInfo({
          authAvailable: !!auth,
          firebaseInitialized: !!auth.app,
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Not set"
        });
      } catch (err) {
        setDebugInfo({ error: err.message });
      }
    };

    checkFirebaseConfig();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate email
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }

      // Validate password
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      // Attempt login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      try {
        // Get user profile to check if they are a venue account
        const userProfile = await getUserProfile(userCredential.user.uid);
        
        // Redirect based on account type
        if (userProfile?.isVenueAccount) {
          router.push('/events'); // Venue manager dashboard
        } else {
          router.push('/map'); // Regular user map view
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Default fallback if profile check fails
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check your email format.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/configuration-not-found') {
        setError('Authentication configuration error. Please contact support.');
      } else {
        setError(error.message || 'An error occurred during login. Please try again.');
      }
      
      setLoading(false);
    }
  };

  const createTestAccount = async () => {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
      setEmail('test@example.com');
      setPassword('password123');
      alert('Test account created! You can now log in with these credentials.');
    } catch (error) {
      setError(`Could not create test account: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>Login | Happen</title>
      </Head>
      
      <div className="max-w-md mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Log In</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Debug information - remove in production */}
        {debugInfo && (
          <div className="bg-gray-100 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded mb-4 text-xs">
            <p>Firebase Debug Info:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
        
        <form onSubmit={handleLogin}>
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
          
          <div className="mb-6">
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
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-gray-700 dark:text-gray-300">
          <p>
            Don't have an account?{' '}
            <Link href={`/signup?type=${accountType}`} className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* For development only - create a test account */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={createTestAccount}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Create Test Account
          </button>
        </div>
      </div>
    </>
  );
}