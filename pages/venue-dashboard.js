import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { getUserProfile } from '../lib/models/userModel';
import Head from 'next/head';
import Link from 'next/link';

// Components for the dashboard
const StatCard = ({ title, value, icon, trend = null }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
      <div className="text-blue-600 dark:text-blue-400 w-6 h-6">
        {icon}
      </div>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {trend && (
        <span className={`text-sm ${
          trend > 0 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {trend > 0 ? `+${trend}%` : `${trend}%`}
        </span>
      )}
    </div>
  </div>
);

const EventsList = ({ events }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
    {events.length === 0 ? (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No upcoming events. Create your first event!</p>
        <Link 
          href="/create-event" 
          className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Event
        </Link>
      </div>
    ) : (
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {events.map((event) => (
          <li key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
            <Link href={`/events/${event.id}`} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{event.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(event.startDate).toLocaleDateString()} · {event.attendees} attending
                </p>
              </div>
              <span className="text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ActivityList = ({ activities }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
    {activities.length === 0 ? (
      <div className="text-center text-gray-500 dark:text-gray-400">
        <p>No recent activity.</p>
      </div>
    ) : (
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-start">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 ${
              activity.type === 'follow' 
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' 
                : activity.type === 'rsvp' 
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            }`}>
              {activity.type === 'follow' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              {activity.type === 'rsvp' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {activity.type === 'review' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">{activity.user}</span> {activity.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activity.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ActionCard = ({ title, description, icon, href }) => (
  <Link href={href}>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3">
          {icon}
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">
        {description}
      </p>
    </div>
  </Link>
);

export default function VenueDashboard() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const router = useRouter();
  
  // Mock data for demonstration
  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Friday Night Music Showcase', 
      startDate: '2025-03-28T20:00:00', 
      attendees: 24 
    },
    { 
      id: 'event2', 
      name: 'Weekend DJ Special', 
      startDate: '2025-03-30T21:00:00', 
      attendees: 42 
    },
    { 
      id: 'event3', 
      name: 'Art Exhibition Opening', 
      startDate: '2025-04-05T18:00:00', 
      attendees: 17 
    }
  ];
  
  const mockActivities = [
    { 
      id: 'act1', 
      type: 'follow', 
      user: 'Alex Morgan', 
      message: 'started following your venue', 
      time: '2 hours ago' 
    },
    { 
      id: 'act2', 
      type: 'rsvp', 
      user: 'Jordan Taylor', 
      message: 'RSVP\'d to Friday Night Music Showcase', 
      time: '3 hours ago' 
    },
    { 
      id: 'act3', 
      type: 'review', 
      user: 'Casey Johnson', 
      message: 'left a 5-star review for your venue', 
      time: '1 day ago' 
    }
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userProfile = await getUserProfile(user.uid);
        
        // If not a venue account, redirect to regular user dashboard
        if (!userProfile?.isVenueAccount) {
          router.push('/dashboard');
          return;
        }
        
        setUserData(userProfile);
        
        // In a real app, fetch real events and activities here
        setUpcomingEvents(mockEvents);
        setRecentActivities(mockActivities);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      if (!user) {
        router.push('/login?type=venue');
      } else {
        fetchUserData();
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Venue Dashboard | Happen</title>
      </Head>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Venue Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your venue and events in one place
            </p>
          </div>
          
          <Link 
            href="/create-event" 
            className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Event
          </Link>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Events" 
            value="8" 
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            } 
            trend={12}
          />
          <StatCard 
            title="Total Attendees" 
            value="246" 
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            } 
            trend={8}
          />
          <StatCard 
            title="Followers" 
            value="83" 
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            } 
            trend={15}
          />
          <StatCard 
            title="Average Rating" 
            value="4.7" 
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            } 
            trend={3}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
              <Link href="/events" className="text-blue-600 dark:text-blue-400 text-sm flex items-center">
                View all
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <EventsList events={upcomingEvents} />
          </div>
          
          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            <ActivityList activities={recentActivities} />
          </div>
        </div>
        
        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard 
              title="Edit Venue Profile" 
              description="Update your venue information, photos, and details"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
              href="/venue-profile"
            />
            <ActionCard 
              title="View Analytics" 
              description="See detailed statistics and metrics for your events"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              href="/analytics"
            />
          </div>
        </div>
      </div>
    </>
  );
}
