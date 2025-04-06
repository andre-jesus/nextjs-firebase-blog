# Happen - User Flow Implementation Plan

## Overview
This document outlines the implementation plan for the Happen platform's user flows, with separate paths for regular users and venue managers.

## Core Flow Strategy

### 1. Landing Page → Login → Specific Dashboard

- **Landing Page**: Unified page with CTAs for both user types
- **Login/Signup**: Account type selection during registration
- **Authentication**: Store user type in profile
- **Redirection**:
  - Regular users → Map view (discovery-focused)
  - Venue managers → Events dashboard (management-focused)

## Implementation Details

### Landing Page Updates

Add clear sections targeting both audience types:

```jsx
// components/landing/HeroSection.js
<div className="grid md:grid-cols-2 gap-8 mt-12">
  {/* Event-goer focused CTA */}
  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-8 text-white">
    <h2 className="text-2xl font-bold mb-4">Discover Events Near You</h2>
    <p className="mb-6">Find exciting events happening around you and connect with friends.</p>
    <Link 
      href="/login?type=user" 
      className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50"
    >
      Browse Events
    </Link>
  </div>
  
  {/* Venue manager focused CTA */}
  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-8 text-white">
    <h2 className="text-2xl font-bold mb-4">Promote Your Venue & Events</h2>
    <p className="mb-6">List your venue, create events, and grow your audience.</p>
    <Link 
      href="/login?type=venue" 
      className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50"
    >
      Manage Venue
    </Link>
  </div>
</div>
```

### Authentication Updates

#### 1. Update Login Component

```jsx
// pages/login.js - Add account type selection

// Get account type from query parameters or default to 'user'
const { type = 'user' } = router.query;
const [accountType, setAccountType] = useState(type);

// Add account type toggle
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
```

#### 2. Update Signup Process

```jsx
// pages/signup.js - Handle account type during registration

// After Firebase Auth signup success
const handleSignup = async (e) => {
  e.preventDefault();
  // ... Firebase auth signup code ...
  
  // Create user profile with account type
  await createUserProfile(user.uid, {
    displayName: name,
    email: email,
    photoURL: null,
    createdAt: serverTimestamp(),
    isVenueAccount: accountType === 'venue',
    // ... other default fields
  });
  
  // Redirect based on account type
  router.push(accountType === 'venue' ? '/events' : '/map');
};
```

#### 3. Create Auth Redirection Hook

```jsx
// lib/hooks/useAuthRedirect.js

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../models/userModel';

export function useAuthRedirect() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  
  useEffect(() => {
    const checkUserType = async () => {
      if (!loading && user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          
          if (userProfile?.isVenueAccount) {
            router.push('/events');
          } else {
            router.push('/map');
          }
        } catch (error) {
          console.error('Error checking user type:', error);
          // Default to regular user view
          router.push('/map');
        }
      }
    };
    
    checkUserType();
  }, [user, loading, router]);
  
  return { user, loading };
}
```

#### 4. Post-Login Redirection

```jsx
// Add to pages that should redirect based on user type (e.g., pages/index.js for logged-in users)

import { useAuthRedirect } from '../lib/hooks/useAuthRedirect';

export default function HomePage() {
  const { user, loading } = useAuthRedirect();
  
  // Only render content if not logged in or still loading
  if (loading) return <div>Loading...</div>;
  if (user) return null; // Content will be replaced by redirect
  
  // Normal page content for non-authenticated users
  return (
    // ...landing page content...
  );
}
```

### Navigation Updates

Customize the navigation menu based on user type:

```jsx
// components/layout/Header.js - Conditional Navigation

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../lib/models/userModel';

export default function Header() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  
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
    
    fetchUserData();
  }, [user]);

  const isVenueAccount = userData?.isVenueAccount;
  
  return (
    <header>
      {/* ... other header content ... */}
      
      <nav>
        {/* Common navigation items */}
        <Link href="/">Home</Link>
        
        {/* User-specific navigation */}
        {user && !isVenueAccount && (
          <>
            <Link href="/map">Discover</Link>
            <Link href="/events">Browse Events</Link>
            <Link href="/moodboard">Saved Events</Link>
            <Link href="/friends">Friends</Link>
          </>
        )}
        
        {/* Venue-specific navigation */}
        {user && isVenueAccount && (
          <>
            <Link href="/events">My Events</Link>
            <Link href="/create-event">Create Event</Link>
            <Link href="/venue-dashboard">Venue Dashboard</Link>
            <Link href="/analytics">Analytics</Link>
          </>
        )}
        
        {/* ... auth buttons ... */}
      </nav>
    </header>
  );
}
```

## Venue Dashboard Features

When a user is registered as a venue manager, they'll need specific dashboards and tools:

### 1. Venue Dashboard (pages/venue-dashboard.js)

Dashboard overview with statistics and quick actions:

```jsx
// pages/venue-dashboard.js
export default function VenueDashboard() {
  // ... fetch venue data, events, analytics ...
  
  return (
    <div>
      <h1>Venue Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Events" value={totalEvents} icon={<CalendarIcon />} />
        <StatCard title="Total Attendees" value={totalAttendees} icon={<UserGroupIcon />} />
        <StatCard title="Followers" value={followers} icon={<HeartIcon />} />
      </div>
      
      {/* Upcoming Events */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2>Upcoming Events</h2>
          <Link href="/create-event">+ Create Event</Link>
        </div>
        <EventsList events={upcomingEvents} />
      </div>
      
      {/* Recent Activity */}
      <div className="mb-8">
        <h2>Recent Activity</h2>
        <ActivityList activities={recentActivities} />
      </div>
      
      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <ActionCard 
          title="Edit Venue Profile" 
          description="Update your venue information"
          icon={<PencilIcon />}
          href="/venue-profile"
        />
        <ActionCard 
          title="View Analytics" 
          description="See detailed event statistics"
          icon={<ChartIcon />}
          href="/analytics"
        />
      </div>
    </div>
  );
}
```

### 2. Venue Profile Management (pages/venue-profile.js)

```jsx
// pages/venue-profile.js
export default function VenueProfile() {
  // ... fetch venue data, handle updates ...
  
  return (
    <form onSubmit={handleSubmit}>
      <h1>Venue Profile</h1>
      
      {/* Basic Information */}
      <section className="mb-8">
        <h2>Basic Information</h2>
        
        <div className="mb-4">
          <label>Venue Name</label>
          <input
            type="text"
            name="name"
            value={venueData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label>Description</label>
          <textarea
            name="description"
            value={venueData.description}
            onChange={handleInputChange}
            rows="4"
          />
        </div>
        
        {/* Other basic fields: categories, contact info, etc. */}
      </section>
      
      {/* Location Information */}
      <section className="mb-8">
        <h2>Location</h2>
        
        <div className="mb-4">
          <label>Address</label>
          <input
            type="text"
            name="location.address"
            value={venueData.location.address}
            onChange={handleInputChange}
          />
        </div>
        
        {/* Other location fields */}
      </section>
      
      {/* Photos */}
      <section className="mb-8">
        <h2>Venue Photos</h2>
        <VenuePhotoUploader
          currentPhotos={venueData.images}
          onImagesChange={handleImagesChange}
        />
      </section>
      
      {/* Operating Hours */}
      <section className="mb-8">
        <h2>Business Hours</h2>
        <HoursEditor
          hours={venueData.hoursOfOperation}
          onChange={handleHoursChange}
        />
      </section>
      
      <button type="submit">Save Changes</button>
    </form>
  );
}
```

### 3. Event Management (pages/events.js for venue users)

Add venue-specific features to the events list:

```jsx
// Additional venue-specific features for events page
{isVenueAccount && (
  <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold">Your Events</h2>
      <Link 
        href="/create-event" 
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Create Event
      </Link>
    </div>
    
    <div className="mt-4">
      <ul className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <li>
          <button
            className={`px-4 py-2 ${
              eventsFilter === 'upcoming' ? 'border-b-2 border-blue-600 font-medium' : ''
            }`}
            onClick={() => setEventsFilter('upcoming')}
          >
            Upcoming
          </button>
        </li>
        <li>
          <button
            className={`px-4 py-2 ${
              eventsFilter === 'past' ? 'border-b-2 border-blue-600 font-medium' : ''
            }`}
            onClick={() => setEventsFilter('past')}
          >
            Past
          </button>
        </li>
        <li>
          <button
            className={`px-4 py-2 ${
              eventsFilter === 'draft' ? 'border-b-2 border-blue-600 font-medium' : ''
            }`}
            onClick={() => setEventsFilter('draft')}
          >
            Drafts
          </button>
        </li>
      </ul>
    </div>
  </div>
)}
```

## Implementation Timeline

1. **Phase 1 - Authentication & User Types**
   - Update user model and authentication
   - Add account type selection to login/signup
   - Implement redirect hook

2. **Phase 2 - Navigation & Landing Page**
   - Update landing page with dual CTAs
   - Customize navigation based on user type
   - Add account-specific dashboard links

3. **Phase 3 - Venue Management**
   - Create venue dashboard
   - Build venue profile management
   - Add event management for venues

4. **Phase 4 - Integration & Testing**
   - Connect all components
   - Test user flows for both account types
   - Optimize UX for each user journey

## Notes

- This implementation maintains a single codebase while providing customized experiences
- Each user type will see navigation and options most relevant to their needs
- Regular users focus on discovery and social features
- Venue managers focus on management and analytics
- Cross-functionality is maintained (venue managers can still browse events as attendees)
