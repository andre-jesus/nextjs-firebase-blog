import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';

/**
 * SocialFeed component for displaying user activity feed
 */
const SocialFeed = () => {
  const [user] = useAuthState(auth);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedType, setFeedType] = useState('friends'); // 'friends', 'all', 'my'

  // Fetch activities when user or feedType changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let activitiesQuery;
        
        if (feedType === 'my') {
          // Get current user's activities
          activitiesQuery = query(
            collection(db, 'activities'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        } else if (feedType === 'friends') {
          // Get user's friends
          const friendshipsQuery = query(
            collection(db, 'friendships'),
            where('status', '==', 'accepted'),
            where('participants', 'array-contains', user.uid)
          );
          
          const friendshipsSnapshot = await getDocs(friendshipsQuery);
          
          // Extract friend IDs
          const friendIds = [];
          friendshipsSnapshot.docs.forEach(doc => {
            const friendship = doc.data();
            const friendId = friendship.participants.find(id => id !== user.uid);
            if (friendId) {
              friendIds.push(friendId);
            }
          });
          
          // Include current user's ID to show their activities too
          friendIds.push(user.uid);
          
          if (friendIds.length > 0) {
            // Get activities from friends
            activitiesQuery = query(
              collection(db, 'activities'),
              where('userId', 'in', friendIds),
              where('visibility', '==', 'public'),
              orderBy('timestamp', 'desc'),
              limit(20)
            );
          } else {
            // No friends, just show user's activities
            activitiesQuery = query(
              collection(db, 'activities'),
              where('userId', '==', user.uid),
              orderBy('timestamp', 'desc'),
              limit(20)
            );
          }
        } else {
          // Get all public activities
          activitiesQuery = query(
            collection(db, 'activities'),
            where('visibility', '==', 'public'),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        }
        
        if (activitiesQuery) {
          const activitiesSnapshot = await getDocs(activitiesQuery);
          
          // Process activities
          const activitiesData = [];
          for (const activityDoc of activitiesSnapshot.docs) {
            const activity = { id: activityDoc.id, ...activityDoc.data() };
            
            // Get user data
            const userDoc = await getDoc(doc(db, 'users', activity.userId));
            let userData = null;
            
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
            
            // Get related data based on activity type
            let relatedData = null;
            
            if (activity.type === 'check-in' && activity.eventId) {
              const eventDoc = await getDoc(doc(db, 'events', activity.eventId));
              if (eventDoc.exists()) {
                relatedData = { event: { id: eventDoc.id, ...eventDoc.data() } };
              }
            } else if (activity.type === 'friend-connection' && activity.friendId) {
              const friendDoc = await getDoc(doc(db, 'users', activity.friendId));
              if (friendDoc.exists()) {
                relatedData = { friend: { id: friendDoc.id, ...friendDoc.data() } };
              }
            } else if (activity.type === 'event-rsvp' && activity.eventId) {
              const eventDoc = await getDoc(doc(db, 'events', activity.eventId));
              if (eventDoc.exists()) {
                relatedData = { event: { id: eventDoc.id, ...eventDoc.data() } };
              }
            } else if (activity.type === 'review' && activity.eventId) {
              const eventDoc = await getDoc(doc(db, 'events', activity.eventId));
              if (eventDoc.exists()) {
                relatedData = { 
                  event: { id: eventDoc.id, ...eventDoc.data() },
                  rating: activity.rating,
                  comment: activity.comment
                };
              }
            }
            
            activitiesData.push({
              ...activity,
              user: userData,
              relatedData
            });
          }
          
          setActivities(activitiesData);
        } else {
          setActivities([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activity feed. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [user, feedType]);
  
  // Render activity based on type
  const renderActivity = (activity) => {
    if (!activity.user) return null;
    
    const timestamp = activity.timestamp ? new Date(activity.timestamp.seconds * 1000) : null;
    
    return (
      <div key={activity.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
        <div className="flex items-start space-x-3">
          <img 
            src={activity.user.photoURL || '/images/default-avatar.png'} 
            alt={activity.user.displayName || 'User'} 
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/profile/${activity.userId}`}>
                  <a className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {activity.user.displayName || 'Unknown User'}
                  </a>
                </Link>
                <span className="text-gray-600 dark:text-gray-400"> {getActivityText(activity)}</span>
              </div>
              {timestamp && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(timestamp)}
                </span>
              )}
            </div>
            
            {activity.type === 'review' && activity.relatedData && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg 
                      key={i}
                      className={`w-4 h-4 ${i < activity.relatedData.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{activity.relatedData.comment}</p>
              </div>
            )}
            
            {activity.relatedData && activity.relatedData.event && (
              <div className="mt-2">
                <Link href={`/events/${activity.relatedData.event.id}`}>
                  <a className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    {activity.relatedData.event.title}
                  </a>
                </Link>
                {activity.relatedData.event.venue && activity.relatedData.event.venue.name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    at {activity.relatedData.event.venue.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Get text description based on activity type
  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'check-in':
        return 'checked in to an event';
      case 'friend-connection':
        if (activity.relatedData && activity.relatedData.friend) {
          return `became friends with ${activity.relatedData.friend.displayName || 'another user'}`;
        }
        return 'made a new friend';
      case 'event-rsvp':
        return 'is going to an event';
      case 'review':
        return 'reviewed an event';
      default:
        return 'did something';
    }
  };
  
  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };
  
  if (!user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view the activity feed.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Activity Feed</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setFeedType('friends')}
            className={`px-3 py-1 rounded ${feedType === 'friends' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            Friends
          </button>
          <button 
            onClick={() => setFeedType('all')}
            className={`px-3 py-1 rounded ${feedType === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            Everyone
          </button>
          <button 
            onClick={() => setFeedType('my')}
            className={`px-3 py-1 rounded ${feedType === 'my' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            My Activity
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map(activity => renderActivity(activity))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          {feedType === 'friends' 
            ? "No activity from your friends yet. Try adding more friends or switch to 'Everyone' view."
            : feedType === 'my'
              ? "You don't have any activity yet. Check in to events or write reviews to see them here."
              : "No activity to show. Check back later!"}
        </p>
      )}
    </div>
  );
};

export default SocialFeed;
