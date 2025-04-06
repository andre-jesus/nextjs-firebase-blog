import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';

/**
 * EventCheckIn component for handling user check-ins at events
 * @param {Object} props - Component props
 * @param {string} props.eventId - ID of the event to check in to
 */
const EventCheckIn = ({ eventId }) => {
  const [user] = useAuthState(auth);
  const [event, setEvent] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInCount, setCheckInCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch event data and check-in status
  useEffect(() => {
    if (!eventId || !user) {
      setLoading(false);
      return;
    }

    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get event data
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (!eventDoc.exists()) {
          setError('Event not found');
          setLoading(false);
          return;
        }
        
        const eventData = { id: eventDoc.id, ...eventDoc.data() };
        setEvent(eventData);
        
        // Check if user is already checked in
        const checkInsQuery = query(
          collection(db, 'checkIns'),
          where('eventId', '==', eventId),
          where('userId', '==', user.uid)
        );
        
        const checkInsSnapshot = await getDocs(checkInsQuery);
        setIsCheckedIn(!checkInsSnapshot.empty);
        
        // Get total check-in count
        const allCheckInsQuery = query(
          collection(db, 'checkIns'),
          where('eventId', '==', eventId)
        );
        
        const allCheckInsSnapshot = await getDocs(allCheckInsQuery);
        setCheckInCount(allCheckInsSnapshot.size);
        
        // Get friends who are checked in
        if (user) {
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
          
          // Get friends who are checked in to this event
          if (friendIds.length > 0) {
            const friendCheckInsQuery = query(
              collection(db, 'checkIns'),
              where('eventId', '==', eventId),
              where('userId', 'in', friendIds)
            );
            
            const friendCheckInsSnapshot = await getDocs(friendCheckInsQuery);
            
            // Get friend user data
            const checkedInFriends = [];
            for (const checkInDoc of friendCheckInsSnapshot.docs) {
              const checkIn = checkInDoc.data();
              
              const userDoc = await getDoc(doc(db, 'users', checkIn.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                checkedInFriends.push({
                  userId: userData.uid,
                  displayName: userData.displayName || 'Unknown User',
                  photoURL: userData.photoURL || '/images/default-avatar.png',
                  checkInTime: checkIn.timestamp
                });
              }
            }
            
            setFriends(checkedInFriends);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching event data:', err);
        setError('Failed to load event data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [eventId, user]);
  
  // Handle check-in
  const handleCheckIn = async () => {
    if (!user || !eventId) return;
    
    try {
      // Create check-in record
      const checkInData = {
        userId: user.uid,
        eventId: eventId,
        timestamp: serverTimestamp(),
        status: 'active'
      };
      
      await addDoc(collection(db, 'checkIns'), checkInData);
      
      // Update event attendee count
      if (event) {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
          attendeeCount: (event.attendeeCount || 0) + 1
        });
      }
      
      // Update UI
      setIsCheckedIn(true);
      setCheckInCount(prevCount => prevCount + 1);
      
      // Create activity feed item
      const activityData = {
        userId: user.uid,
        type: 'check-in',
        eventId: eventId,
        timestamp: serverTimestamp(),
        visibility: 'public'
      };
      
      await addDoc(collection(db, 'activities'), activityData);
      
    } catch (err) {
      console.error('Error checking in:', err);
      setError('Failed to check in. Please try again later.');
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Event not found</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to check in to this event</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Event Check-In</h2>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{event.title}</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {event.venue && event.venue.name ? event.venue.name : 'No venue specified'}
        </p>
        {event.startDateTime && (
          <p className="text-gray-600 dark:text-gray-400">
            {new Date(event.startDateTime.seconds * 1000).toLocaleString()}
          </p>
        )}
      </div>
      
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{checkInCount}</div>
          <div className="text-gray-600 dark:text-gray-400">people checked in</div>
        </div>
        
        {!isCheckedIn ? (
          <button
            onClick={handleCheckIn}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Check In Now
          </button>
        ) : (
          <div className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg inline-block">
            ✓ You're checked in!
          </div>
        )}
      </div>
      
      {friends.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Friends at this event</h3>
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.userId} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" />
                <div>
                  <Link href={`/profile/${friend.userId}`}>
                    <a className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {friend.displayName}
                    </a>
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Checked in {friend.checkInTime ? new Date(friend.checkInTime.seconds * 1000).toLocaleTimeString() : 'recently'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCheckIn;
