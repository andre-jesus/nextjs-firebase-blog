import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create a new user profile
 * @param {string} userId - Firebase Auth user ID
 * @param {Object} userData - User profile data
 * @returns {Promise<void>}
 */
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Default user data structure
    const defaultUserData = {
      displayName: userData.displayName || '',
      email: userData.email || '',
      photoURL: userData.photoURL || '',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      bio: '',
      location: {
        geopoint: null,
        address: ''
      },
      preferences: {
        categories: [],
        maxDistance: 25, // km
        priceRange: {
          min: null,
          max: null
        },
        notificationSettings: {
          eventReminders: true,
          friendActivity: true,
          venueUpdates: true,
          recommendations: true
        }
      },
      stats: {
        eventsAttended: 0,
        checkIns: 0,
        reviews: 0,
        followers: 0,
        following: 0
      },
      isVenueAccount: false,
      venueId: null
    };
    
    // Merge provided data with defaults
    const mergedData = {
      ...defaultUserData,
      ...userData,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    await setDoc(userRef, mergedData);
    return userId;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get a user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile data
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update a user profile
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Add last updated timestamp
    const updatedData = {
      ...userData,
      lastActive: serverTimestamp()
    };
    
    await updateDoc(userRef, updatedData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Get user's friends
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of friend user objects
 */
export const getUserFriends = async (userId) => {
  try {
    // Query friendships where this user is either userId or friendId and status is accepted
    const friendsQuery1 = query(
      collection(db, 'friends'),
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const friendsQuery2 = query(
      collection(db, 'friends'),
      where('friendId', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(friendsQuery1),
      getDocs(friendsQuery2)
    ]);
    
    // Extract friend IDs
    const friendIds = [];
    
    snapshot1.forEach(doc => {
      friendIds.push(doc.data().friendId);
    });
    
    snapshot2.forEach(doc => {
      friendIds.push(doc.data().userId);
    });
    
    // Get friend profiles
    const friendProfiles = await Promise.all(
      friendIds.map(friendId => getUserProfile(friendId))
    );
    
    return friendProfiles.filter(Boolean); // Remove any null profiles
  } catch (error) {
    console.error('Error getting user friends:', error);
    throw error;
  }
};

/**
 * Get pending friend requests for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pending friend requests
 */
export const getPendingFriendRequests = async (userId) => {
  try {
    // Get requests where user is the recipient
    const requestsQuery = query(
      collection(db, 'friends'),
      where('friendId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(requestsQuery);
    const pendingRequests = [];
    
    for (const doc of snapshot.docs) {
      const requestData = doc.data();
      const senderProfile = await getUserProfile(requestData.userId);
      
      pendingRequests.push({
        id: doc.id,
        ...requestData,
        sender: senderProfile
      });
    }
    
    return pendingRequests;
  } catch (error) {
    console.error('Error getting pending friend requests:', error);
    throw error;
  }
};

/**
 * Get user's followed venues
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of venue objects
 */
export const getUserFollowedVenues = async (userId) => {
  try {
    const followersQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('followeeType', '==', 'venue')
    );
    
    const snapshot = await getDocs(followersQuery);
    const venueIds = snapshot.docs.map(doc => doc.data().followeeId);
    
    // Get venue details
    const venuePromises = venueIds.map(venueId => {
      const venueRef = doc(db, 'venues', venueId);
      return getDoc(venueRef).then(venueSnap => {
        if (venueSnap.exists()) {
          return {
            id: venueSnap.id,
            ...venueSnap.data()
          };
        }
        return null;
      });
    });
    
    const venues = await Promise.all(venuePromises);
    return venues.filter(Boolean); // Remove null venues
  } catch (error) {
    console.error('Error getting followed venues:', error);
    throw error;
  }
};

/**
 * Get user's followed categories
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of category objects
 */
export const getUserFollowedCategories = async (userId) => {
  try {
    const followersQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('followeeType', '==', 'category')
    );
    
    const snapshot = await getDocs(followersQuery);
    const categoryIds = snapshot.docs.map(doc => doc.data().followeeId);
    
    // Get category details
    const categoryPromises = categoryIds.map(categoryId => {
      const categoryRef = doc(db, 'categories', categoryId);
      return getDoc(categoryRef).then(categorySnap => {
        if (categorySnap.exists()) {
          return {
            id: categorySnap.id,
            ...categorySnap.data()
          };
        }
        return null;
      });
    });
    
    const categories = await Promise.all(categoryPromises);
    return categories.filter(Boolean); // Remove null categories
  } catch (error) {
    console.error('Error getting followed categories:', error);
    throw error;
  }
};

/**
 * Update user location
 * @param {string} userId - User ID
 * @param {Object} location - Location object with geopoint and address
 * @returns {Promise<void>}
 */
export const updateUserLocation = async (userId, location) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      location,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user location:', error);
    throw error;
  }
};

/**
 * Send a friend request
 * @param {string} userId - Sender user ID
 * @param {string} friendId - Recipient user ID
 * @returns {Promise<string>} ID of the created friendship record
 */
export const sendFriendRequest = async (userId, friendId) => {
  try {
    // Check if a friendship already exists
    const existingQuery = query(
      collection(db, 'friends'),
      where('userId', 'in', [userId, friendId]),
      where('friendId', 'in', [userId, friendId])
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];
      return existingDoc.id;
    }
    
    // Create new friendship record
    const friendshipData = {
      userId,
      friendId,
      status: 'pending',
      initiatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastInteraction: serverTimestamp()
    };
    
    const friendsRef = collection(db, 'friends');
    const docRef = doc(friendsRef);
    await setDoc(docRef, friendshipData);
    
    // Create notification for the recipient
    const notificationData = {
      userId: friendId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `You have a new friend request.`,
      sourceId: userId,
      sourceType: 'user',
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: null
    };
    
    const notificationsRef = collection(db, 'notifications');
    await setDoc(doc(notificationsRef), notificationData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

/**
 * Respond to a friend request
 * @param {string} friendshipId - ID of the friendship record
 * @param {string} userId - User ID of the responder
 * @param {boolean} accept - Whether to accept the request
 * @returns {Promise<void>}
 */
export const respondToFriendRequest = async (friendshipId, userId, accept) => {
  try {
    const friendshipRef = doc(db, 'friends', friendshipId);
    const friendshipSnap = await getDoc(friendshipRef);
    
    if (!friendshipSnap.exists()) {
      throw new Error('Friend request not found');
    }
    
    const friendshipData = friendshipSnap.data();
    
    // Verify this user is the recipient
    if (friendshipData.friendId !== userId) {
      throw new Error('Not authorized to respond to this friend request');
    }
    
    // Update friendship record
    await updateDoc(friendshipRef, {
      status: accept ? 'accepted' : 'declined',
      updatedAt: serverTimestamp()
    });
    
    // Create notification for the sender
    const notificationData = {
      userId: friendshipData.userId,
      type: 'friend_request_response',
      title: accept ? 'Friend Request Accepted' : 'Friend Request Declined',
      message: accept ? 'Your friend request was accepted.' : 'Your friend request was declined.',
      sourceId: userId,
      sourceType: 'user',
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: null
    };
    
    const notificationsRef = collection(db, 'notifications');
    await setDoc(doc(notificationsRef), notificationData);
    
    // Update user stats if accepted
    if (accept) {
      const [userRef, friendRef] = [
        doc(db, 'users', userId),
        doc(db, 'users', friendshipData.userId)
      ];
      
      const [userSnap, friendSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(friendRef)
      ]);
      
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          'stats.following': (userSnap.data().stats?.following || 0) + 1
        });
      }
      
      if (friendSnap.exists()) {
        await updateDoc(friendRef, {
          'stats.followers': (friendSnap.data().stats?.followers || 0) + 1
        });
      }
    }
  } catch (error) {
    console.error('Error responding to friend request:', error);
    throw error;
  }
};

/**
 * Follow a venue
 * @param {string} userId - User ID
 * @param {string} venueId - Venue ID
 * @returns {Promise<string>} ID of the created follow record
 */
export const followVenue = async (userId, venueId) => {
  try {
    // Check if already following
    const existingQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('followeeId', '==', venueId),
      where('followeeType', '==', 'venue')
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      return existingSnapshot.docs[0].id;
    }
    
    // Create follow record
    const followData = {
      followerId: userId,
      followeeId: venueId,
      followeeType: 'venue',
      createdAt: serverTimestamp(),
      notificationsEnabled: true
    };
    
    const followersRef = collection(db, 'followers');
    const docRef = doc(followersRef);
    await setDoc(docRef, followData);
    
    // Update user stats
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        'stats.following': (userSnap.data().stats?.following || 0) + 1
      });
    }
    
    // Update venue stats
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (venueSnap.exists()) {
      const venueData = venueSnap.data();
      await updateDoc(venueRef, {
        followers: (venueData.followers || 0) + 1
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error following venue:', error);
    throw error;
  }
};

/**
 * Unfollow a venue
 * @param {string} userId - User ID
 * @param {string} venueId - Venue ID
 * @returns {Promise<void>}
 */
export const unfollowVenue = async (userId, venueId) => {
  try {
    // Find the follow record
    const followQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('followeeId', '==', venueId),
      where('followeeType', '==', 'venue')
    );
    
    const followSnapshot = await getDocs(followQuery);
    
    if (followSnapshot.empty) {
      return;
    }
    
    // Delete follow records
    const deletePromises = followSnapshot.docs.map(doc => {
      return doc.ref.delete();
    });
    
    await Promise.all(deletePromises);
    
    // Update user stats
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const following = Math.max(0, (userData.stats?.following || 0) - 1);
      await updateDoc(userRef, {
        'stats.following': following
      });
    }
    
    // Update venue stats
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (venueSnap.exists()) {
      const venueData = venueSnap.data();
      const followers = Math.max(0, (venueData.followers || 0) - 1);
      await updateDoc(venueRef, {
        followers
      });
    }
  } catch (error) {
    console.error('Error unfollowing venue:', error);
    throw error;
  }
};

/**
 * Get user's saved events (mood board)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Mood board data with events
 */
export const getUserMoodBoard = async (userId) => {
  try {
    const moodBoardRef = doc(db, 'moodBoard', userId);
    const moodBoardSnap = await getDoc(moodBoardRef);
    
    if (!moodBoardSnap.exists()) {
      return {
        savedEvents: [],
        collections: []
      };
    }
    
    const moodBoardData = moodBoardSnap.data();
    
    // Get detailed event data for saved events
    if (moodBoardData.savedEvents && moodBoardData.savedEvents.length > 0) {
      const eventPromises = moodBoardData.savedEvents.map(async (savedEvent) => {
        const eventRef = doc(db, 'events', savedEvent.eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          return {
            ...savedEvent,
            event: {
              id: eventSnap.id,
              ...eventSnap.data()
            }
          };
        }
        
        return savedEvent;
      });
      
      moodBoardData.savedEvents = await Promise.all(eventPromises);
    }
    
    return moodBoardData;
  } catch (error) {
    console.error('Error getting user mood board:', error);
    throw error;
  }
};

/**
 * Check if a user exists
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether the user exists
 */
export const userExists = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

/**
 * Search for users by displayName
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of user objects
 */
export const searchUsers = async (query, limit = 10) => {
  try {
    // This is a simple implementation that gets all users and filters client-side
    // For production, you would use Firestore's array-contains with keywords or a search service like Algolia
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      
      // Check if displayName contains the query (case insensitive)
      if (userData.displayName && 
          userData.displayName.toLowerCase().includes(query.toLowerCase())) {
        users.push({
          id: doc.id,
          ...userData
        });
      }
    });
    
    return users.slice(0, limit);
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};
