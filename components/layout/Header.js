import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { getUserProfile } from '../../lib/models/userModel';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const userMenuRef = useRef(null);

  // Fetch user data including account type
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
    
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Determine if this is a venue account
  const isVenueAccount = userData?.isVenueAccount || false;

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

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14H8c-.55 0-1-.45-1-1s.45-1 1-1h8.5c.55 0 1 .45 1 1s-.45 1-1 1zm-1.25-4H8c-.55 0-1-.45-1-1s.45-1 1-1h7.25c.55 0 1 .45 1 1s-.45 1-1 1z"/>
            </svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Happen</span>
          </Link>
          
          {/* Desktop Navigation with Conditional Links */}
          <nav className="hidden md:flex space-x-6 text-gray-700 dark:text-gray-300">
            {/* Regular user navigation */}
            {user && !isVenueAccount && (
              <>
                <Link href="/map" className={`hover:text-blue-600 ${router.pathname === '/map' ? 'text-blue-600 font-medium' : ''}`}>
                  Discover
                </Link>
                <Link href="/events" className={`hover:text-blue-600 ${router.pathname.startsWith('/events') ? 'text-blue-600 font-medium' : ''}`}>
                  Events
                </Link>
                <Link href="/venues" className={`hover:text-blue-600 ${router.pathname.startsWith('/venues') ? 'text-blue-600 font-medium' : ''}`}>
                  Venues
                </Link>
                <Link href="/moodboard" className={`hover:text-blue-600 ${router.pathname.startsWith('/moodboard') ? 'text-blue-600 font-medium' : ''}`}>
                  Saved
                </Link>
                <Link href="/social/friends" className={`hover:text-blue-600 ${router.pathname.startsWith('/social') ? 'text-blue-600 font-medium' : ''}`}>
                  Friends
                </Link>
              </>
            )}

            {/* Venue manager navigation */}
            {user && isVenueAccount && (
              <>
                <Link href="/venue-dashboard" className={`hover:text-blue-600 ${router.pathname === '/venue-dashboard' ? 'text-blue-600 font-medium' : ''}`}>
                  Dashboard
                </Link>
                <Link href="/events" className={`hover:text-blue-600 ${router.pathname.startsWith('/events') ? 'text-blue-600 font-medium' : ''}`}>
                  My Events
                </Link>
                <Link href="/create-event" className={`hover:text-blue-600 ${router.pathname === '/create-event' ? 'text-blue-600 font-medium' : ''}`}>
                  Create Event
                </Link>
                <Link href="/venue-profile" className={`hover:text-blue-600 ${router.pathname === '/venue-profile' ? 'text-blue-600 font-medium' : ''}`}>
                  Venue Profile
                </Link>
                <Link href="/analytics" className={`hover:text-blue-600 ${router.pathname === '/analytics' ? 'text-blue-600 font-medium' : ''}`}>
                  Analytics
                </Link>
              </>
            )}

            {/* Non-authenticated user navigation */}
            {!user && (
              <>
                <Link href="/map" className={`hover:text-blue-600 ${router.pathname === '/map' ? 'text-blue-600 font-medium' : ''}`}>
                  Map
                </Link>
                <Link href="/events" className={`hover:text-blue-600 ${router.pathname.startsWith('/events') ? 'text-blue-600 font-medium' : ''}`}>
                  Events
                </Link>
                <Link href="/venues" className={`hover:text-blue-600 ${router.pathname.startsWith('/venues') ? 'text-blue-600 font-medium' : ''}`}>
                  Venues
                </Link>
              </>
            )}
          </nav>
          
          {/* Search, Theme Toggle, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events..."
                className="w-40 px-3 py-1.5 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600"
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
            
            <ThemeToggle />
            
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || user.email} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {getInitials(user.displayName || user.email)}
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
                    <div className="py-1">
                      {/* Conditional menu items based on account type */}
                      {isVenueAccount ? (
                        // Venue manager menu items
                        <>
                          <Link 
                            href="/venue-dashboard" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Venue Dashboard
                          </Link>
                          <Link 
                            href="/events" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            My Events
                          </Link>
                          <Link 
                            href="/create-event" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Create Event
                          </Link>
                          <Link 
                            href="/venue-profile" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Venue Settings
                          </Link>
                        </>
                      ) : (
                        // Regular user menu items
                        <>
                          <Link 
                            href="/dashboard" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <Link 
                            href="/profile" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Profile Settings
                          </Link>
                          <Link 
                            href="/moodboard" 
                            className="block px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            Saved Events
                          </Link>
                        </>
                      )}
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
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
              <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Login
              </Link>
            )}

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
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events..."
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
            
            {/* Mobile menu items conditionally rendered */}
            {user && !isVenueAccount ? (
              // Regular user mobile menu
              <>
                <Link 
                  href="/map" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Discover
                </Link>
                <Link
                  href="/events"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Events
                </Link>
                <Link 
                  href="/venues" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Venues
                </Link>
                <Link
                  href="/moodboard"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Saved Events
                </Link>
                <Link
                  href="/social/friends"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Friends
                </Link>
                <Link
                  href="/dashboard"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : user && isVenueAccount ? (
              // Venue manager mobile menu
              <>
                <Link 
                  href="/venue-dashboard" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/events"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  My Events
                </Link>
                <Link 
                  href="/create-event" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Create Event
                </Link>
                <Link
                  href="/venue-profile"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Venue Profile
                </Link>
                <Link
                  href="/analytics"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Analytics
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400 w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              // Not logged in mobile menu
              <>
                <Link 
                  href="/map" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Map
                </Link>
                <Link
                  href="/events"
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Events
                </Link>
                <Link 
                  href="/venues" 
                  className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Venues
                </Link>
              </>
            )}
            
            {!user && (
              <Link 
                href="/login" 
                className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
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
