import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { getUserProfile } from '../lib/models/userModel';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [user, authLoading] = useAuthState(auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const userMenuRef = useRef(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userProfile = await getUserProfile(user.uid);
        setUserData(userProfile);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);

  const handleSignOut = () => {
    signOut(auth);
    setUserMenuOpen(false);
    router.push('/');
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    router.push({
      pathname: '/search',
      query: { q: searchTerm.trim() }
    });
    
    setSearchTerm('');
  };

  // Helper to get user's initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if the user is a venue account
  const isVenueAccount = userData?.isVenueAccount === true;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Happen
          </Link>
          
          {/* Desktop Search */}
          <div className="hidden md:block flex-grow max-w-md mx-6">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <nav className="hidden md:flex space-x-6 text-gray-900 dark:text-gray-200">
              <Link href="/" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                Home
              </Link>
              
              {/* Common navigation items */}
              <Link href="/categories" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/categories' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                Categories
              </Link>
              
              {/* User-specific navigation */}
              {user && !isVenueAccount && (
                <>
                  <Link href="/map" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/map' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    Discover
                  </Link>
                  <Link href="/events" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/events') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    Events
                  </Link>
                  <Link href="/moodboard" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/moodboard') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    Saved
                  </Link>
                </>
              )}
              
              {/* Venue-specific navigation */}
              {user && isVenueAccount && (
                <>
                  <Link href="/events" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/events') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    My Events
                  </Link>
                  <Link href="/create-event" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/create-event' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    Create Event
                  </Link>
                  <Link href="/venue-dashboard" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/venue-dashboard' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                    Dashboard
                  </Link>
                </>
              )}
              
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                      {userData?.photoURL ? (
                        <img 
                          src={userData.photoURL} 
                          alt={userData.displayName || user.displayName || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                          {getInitials(userData?.displayName || user.displayName || user.email)}
                        </span>
                      )}
                    </div>
                    <span>{userData?.displayName || user.displayName || user.email.split('@')[0]}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
                      <div className="py-1">
                        {/* Different dashboard links based on account type */}
                        {isVenueAccount ? (
                          <Link 
                            href="/venue-dashboard" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Venue Dashboard
                          </Link>
                        ) : (
                          <Link 
                            href="/dashboard" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                        )}
                        
                        <Link 
                          href="/profile" 
                          className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Profile Settings
                        </Link>
                        
                        {isVenueAccount && (
                          <Link 
                            href="/venue-profile" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Venue Settings
                          </Link>
                        )}
                        
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className={`hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/login' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}>
                  Login
                </Link>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-900 dark:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 text-gray-900 dark:text-gray-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </form>
            
            <Link 
              href="/" 
              className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            
            <Link
              href="/categories"
              className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/categories' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Categories
            </Link>
            
            {/* User-specific navigation */}
            {user && !isVenueAccount && (
              <>
                <Link 
                  href="/map" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/map' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Discover
                </Link>
                <Link 
                  href="/events" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/events') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Events
                </Link>
                <Link 
                  href="/moodboard" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/moodboard') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Saved
                </Link>
              </>
            )}
            
            {/* Venue-specific navigation */}
            {user && isVenueAccount && (
              <>
                <Link 
                  href="/events" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname.startsWith('/events') ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  My Events
                </Link>
                <Link 
                  href="/create-event" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/create-event' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Create Event
                </Link>
                <Link 
                  href="/venue-dashboard" 
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/venue-dashboard' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </>
            )}
            
            {user && (
              <>
                <Link
                  href="/profile"
                  className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/profile' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                
                {isVenueAccount && (
                  <Link
                    href="/venue-profile"
                    className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/venue-profile' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    Venue Settings
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            )}
            
            {!user && (
              <Link 
                href="/login" 
                className={`block py-2 hover:text-blue-600 dark:hover:text-blue-400 ${router.pathname === '/login' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}