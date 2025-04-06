import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';

/**
 * FriendConnections component for managing user connections
 */
const FriendConnections = () => {
  const [user] = useAuthState(auth);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch friends and requests when user changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchFriendData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch accepted friends
        const friendsQuery = query(
          collection(db, 'friendships'),
          where('status', '==', 'accepted'),
          where('participants', 'array-contains', user.uid)
        );
        
        // Fetch pending friend requests (received)
        const pendingQuery = query(
          collection(db, 'friendships'),
          where('status', '==', 'pending'),
          where('receiverId', '==', user.uid)
        );
        
        // Fetch sent friend requests
        const sentQuery = query(
          collection(db, 'friendships'),
          where('status', '==', 'pending'),
          where('senderId', '==', user.uid)
        );
        
        const [friendsSnapshot, pendingSnapshot, sentSnapshot] = await Promise.all([
          getDocs(friendsQuery),
          getDocs(pendingQuery),
          getDocs(sentQuery)
        ]);
        
        // Process friends data
        const friendsData = [];
        for (const doc of friendsSnapshot.docs) {
          const friendship = { id: doc.id, ...doc.data() };
          const friendId = friendship.participants.find(id => id !== user.uid);
          
          // Get friend user data
          const userDoc = await getDocs(query(
            collection(db, 'users'),
            where('uid', '==', friendId)
          ));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            friendsData.push({
              friendshipId: doc.id,
              userId: friendId,
              displayName: userData.displayName || 'Unknown User',
              photoURL: userData.photoURL || '/images/default-avatar.png',
              email: userData.email
            });
          }
        }
        
        // Process pending requests
        const pendingData = [];
        for (const doc of pendingSnapshot.docs) {
          const request = { id: doc.id, ...doc.data() };
          
          // Get sender user data
          const userDoc = await getDocs(query(
            collection(db, 'users'),
            where('uid', '==', request.senderId)
          ));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            pendingData.push({
              requestId: doc.id,
              userId: request.senderId,
              displayName: userData.displayName || 'Unknown User',
              photoURL: userData.photoURL || '/images/default-avatar.png',
              email: userData.email,
              timestamp: request.timestamp
            });
          }
        }
        
        // Process sent requests
        const sentData = [];
        for (const doc of sentSnapshot.docs) {
          const request = { id: doc.id, ...doc.data() };
          
          // Get receiver user data
          const userDoc = await getDocs(query(
            collection(db, 'users'),
            where('uid', '==', request.receiverId)
          ));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            sentData.push({
              requestId: doc.id,
              userId: request.receiverId,
              displayName: userData.displayName || 'Unknown User',
              photoURL: userData.photoURL || '/images/default-avatar.png',
              email: userData.email,
              timestamp: request.timestamp
            });
          }
        }
        
        setFriends(friendsData);
        setPendingRequests(pendingData);
        setSentRequests(sentData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching friend data:', err);
        setError('Failed to load friend data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchFriendData();
  }, [user]);
  
  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim() || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Search by display name or email
      const usersQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff')
      );
      
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff')
      );
      
      const [nameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(emailQuery)
      ]);
      
      // Combine results and remove duplicates
      const results = new Map();
      
      // Process name results
      nameSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.uid !== user.uid) {
          results.set(userData.uid, {
            userId: userData.uid,
            displayName: userData.displayName || 'Unknown User',
            photoURL: userData.photoURL || '/images/default-avatar.png',
            email: userData.email
          });
        }
      });
      
      // Process email results
      emailSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.uid !== user.uid) {
          results.set(userData.uid, {
            userId: userData.uid,
            displayName: userData.displayName || 'Unknown User',
            photoURL: userData.photoURL || '/images/default-avatar.png',
            email: userData.email
          });
        }
      });
      
      // Convert map to array
      const searchData = Array.from(results.values());
      
      // Filter out existing friends and requests
      const filteredResults = searchData.filter(result => {
        const isFriend = friends.some(friend => friend.userId === result.userId);
        const isPending = pendingRequests.some(request => request.userId === result.userId);
        const isSent = sentRequests.some(request => request.userId === result.userId);
        return !isFriend && !isPending && !isSent;
      });
      
      setSearchResults(filteredResults);
      setLoading(false);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again later.');
      setLoading(false);
    }
  };
  
  // Send friend request
  const sendFriendRequest = async (receiverId) => {
    if (!user) return;
    
    try {
      const newRequest = {
        senderId: user.uid,
        receiverId: receiverId,
        status: 'pending',
        participants: [user.uid, receiverId],
        timestamp: new Date()
      };
      
      await addDoc(collection(db, 'friendships'), newRequest);
      
      // Update UI
      const receiverDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', receiverId)
      ));
      
      if (!receiverDoc.empty) {
        const userData = receiverDoc.docs[0].data();
        const newSentRequest = {
          userId: receiverId,
          displayName: userData.displayName || 'Unknown User',
          photoURL: userData.photoURL || '/images/default-avatar.png',
          email: userData.email,
          timestamp: new Date()
        };
        
        setSentRequests([...sentRequests, newSentRequest]);
        setSearchResults(searchResults.filter(result => result.userId !== receiverId));
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Failed to send friend request. Please try again later.');
    }
  };
  
  // Accept friend request
  const acceptFriendRequest = async (requestId, senderId) => {
    if (!user) return;
    
    try {
      const requestRef = doc(db, 'friendships', requestId);
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      
      // Update UI
      const senderDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', senderId)
      ));
      
      if (!senderDoc.empty) {
        const userData = senderDoc.docs[0].data();
        const newFriend = {
          friendshipId: requestId,
          userId: senderId,
          displayName: userData.displayName || 'Unknown User',
          photoURL: userData.photoURL || '/images/default-avatar.png',
          email: userData.email
        };
        
        setFriends([...friends, newFriend]);
        setPendingRequests(pendingRequests.filter(request => request.requestId !== requestId));
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request. Please try again later.');
    }
  };
  
  // Reject friend request
  const rejectFriendRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'friendships', requestId);
      await deleteDoc(requestRef);
      
      // Update UI
      setPendingRequests(pendingRequests.filter(request => request.requestId !== requestId));
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError('Failed to reject friend request. Please try again later.');
    }
  };
  
  // Cancel sent request
  const cancelRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'friendships', requestId);
      await deleteDoc(requestRef);
      
      // Update UI
      setSentRequests(sentRequests.filter(request => request.requestId !== requestId));
    } catch (err) {
      console.error('Error canceling friend request:', err);
      setError('Failed to cancel friend request. Please try again later.');
    }
  };
  
  // Remove friend
  const removeFriend = async (friendshipId) => {
    try {
      const friendshipRef = doc(db, 'friendships', friendshipId);
      await deleteDoc(friendshipRef);
      
      // Update UI
      setFriends(friends.filter(friend => friend.friendshipId !== friendshipId));
    } catch (err) {
      console.error('Error removing friend:', err);
      setError('Failed to remove friend. Please try again later.');
    }
  };
  
  if (!user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to manage your connections.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Friend Connections</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}
      
      {/* Search for users */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Find Friends</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email"
            className="flex-grow px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Search
          </button>
        </div>
        
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-4">
            <h4 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Results</h4>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div key={result.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img src={result.photoURL} alt={result.displayName} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{result.displayName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{result.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(result.userId)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {searchTerm && searchResults.length === 0 && !loading && (
          <p className="mt-2 text-gray-500 dark:text-gray-400">No users found matching your search.</p>
        )}
      </div>
      
      {/* Pending friend requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Friend Requests</h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.requestId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img src={request.photoURL} alt={request.displayName} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{request.displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptFriendRequest(request.requestId, request.userId)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.requestId)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Sent friend requests */}
      {sentRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Sent Requests</h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.requestId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img src={request.photoURL} alt={request.displayName} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{request.displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => cancelRequest(request.requestId)}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Friends list */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Your Friends</h3>
        {friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.friendshipId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{friend.displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/profile/${friend.userId}`}>
                    <a className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                      Profile
                    </a>
                  </Link>
                  <button
                    onClick={() => removeFriend(friend.friendshipId)}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">You don't have any friends yet. Use the search above to find friends.</p>
        )}
      </div>
    </div>
  );
};

export default FriendConnections;
