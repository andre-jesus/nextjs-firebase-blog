import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  GeoPoint,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Create a new venue
 * @param {Object} venueData - Venue data
 * @param {string} userId - User ID of creator/owner
 * @returns {Promise<string>} ID of created venue
 */
export const createVenue = async (venueData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create a venue');
    }
    
    const venuesRef = collection(db, 'venues');
    const docRef = doc(venuesRef);
    const venueId = docRef.id;
    
    console.log('Creating venue with ID:', venueId, 'for user:', userId);
    
    // Process location data to ensure it has a GeoPoint
    let locationData = venueData.location || {};
    if (locationData.latitude && locationData.longitude) {
      locationData.geopoint = new GeoPoint(parseFloat(locationData.latitude), parseFloat(locationData.longitude));
    }
    
    // Create slug from name
    const slug = createSlug(venueData.name);
    
    // Prepare venue data for storage - ensure ownerId is set correctly
    const newVenueData = {
      ...venueData,
      slug,
      ownerId: userId,  // Explicitly set ownerId to the provided userId
      location: locationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      eventCount: 0,
      checkInCount: 0,
      followers: 0,
      ratings: {
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      },
      verified: false,
      featured: false,
      status: venueData.status || 'active'
    };
    
    // Save the venue
    console.log('Setting venue document with data:', { ...newVenueData, ownerId: userId });
    await setDoc(docRef, newVenueData);
    console.log('Venue document saved successfully');
    
    // Update categories count
    if (venueData.categories && venueData.categories.length > 0) {
      for (const categoryName of venueData.categories) {
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('name', '==', categoryName)
        );
        
        const categorySnap = await getDocs(categoriesQuery);
        
        if (!categorySnap.empty) {
          const categoryDoc = categorySnap.docs[0];
          await updateDoc(categoryDoc.ref, {
            venueCount: (categoryDoc.data().venueCount || 0) + 1
          });
        }
      }
    }
    
    // Update user's venueId if this is a venue account
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().isVenueAccount) {
      console.log('Updating user profile with venueId:', venueId);
      await updateDoc(userRef, {
        venueId
      });
      console.log('User profile updated successfully');
    }
    
    return venueId;
  } catch (error) {
    console.error('Error creating venue:', error);
    throw error;
  }
};

/**
 * Get a venue by ID
 * @param {string} venueId - Venue ID
 * @returns {Promise<Object>} Venue data
 */
export const getVenue = async (venueId) => {
  try {
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (venueSnap.exists()) {
      return {
        id: venueSnap.id,
        ...venueSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting venue:', error);
    throw error;
  }
};

/**
 * Get venue by slug
 * @param {string} slug - Venue slug
 * @returns {Promise<Object>} Venue data
 */
export const getVenueBySlug = async (slug) => {
  try {
    const venuesQuery = query(
      collection(db, 'venues'),
      where('slug', '==', slug),
      limit(1)
    );
    
    const querySnapshot = await getDocs(venuesQuery);
    
    if (!querySnapshot.empty) {
      const venueDoc = querySnapshot.docs[0];
      return {
        id: venueDoc.id,
        ...venueDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting venue by slug:', error);
    throw error;
  }
};

/**
 * Update a venue
 * @param {string} venueId - Venue ID
 * @param {Object} venueData - Updated venue data
 * @returns {Promise<void>}
 */
export const updateVenue = async (venueId, venueData) => {
  try {
    console.log('Updating venue with ID:', venueId);
    
    // Get the current venue data first
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (!venueSnap.exists()) {
      throw new Error('Venue not found');
    }
    
    const currentData = venueSnap.data();
    console.log('Current venue data:', currentData);
    console.log('Update request data:', venueData);
    
    // Check if the user has permission (this is a fail-safe in addition to Firestore rules)
    if (!venueData.userId && !currentData.ownerId) {
      throw new Error('Venue has no owner defined');
    }
    
    // Process location data
    let locationData = venueData.location || {};
    
    // If location has coordinates, create a GeoPoint
    if (locationData.latitude && locationData.longitude) {
      locationData.geopoint = new GeoPoint(parseFloat(locationData.latitude), parseFloat(locationData.longitude));
    } else if (currentData.location && currentData.location.geopoint) {
      // Preserve the existing geopoint if one exists
      locationData.geopoint = currentData.location.geopoint;
    }
    
    // Update slug if name changed
    let slug = currentData.slug;
    if (venueData.name && venueData.name !== currentData.name) {
      slug = createSlug(venueData.name);
    }
    
    // Create a clean update object that explicitly preserves critical fields
    const updateData = {};
    
    // Always preserve owner ID from the current data, unless we're explicitly transferring ownership
    if (venueData.userId === currentData.ownerId || venueData.ownerId === currentData.ownerId) {
      // If the current user is already the owner, keep it that way
      updateData.ownerId = currentData.ownerId;
    } else if (venueData.userId) {
      // If this is an ownership transfer (which should be rare and handled separately)
      console.log('Updating venue ownership to:', venueData.userId);
      updateData.ownerId = venueData.userId;
    } else if (venueData.ownerId) {
      // If ownerId is explicitly set in the update
      console.log('Setting explicit owner ID:', venueData.ownerId);
      updateData.ownerId = venueData.ownerId;
    } else {
      // Fallback - keep existing owner
      updateData.ownerId = currentData.ownerId;
    }
    
    // Update only fields that are provided in venueData
    if (venueData.name) updateData.name = venueData.name;
    if (venueData.description) updateData.description = venueData.description;
    if (venueData.categories) updateData.categories = venueData.categories;
    if (venueData.contact) updateData.contact = venueData.contact;
    if (venueData.location) updateData.location = locationData;
    if (venueData.hoursOfOperation) updateData.hoursOfOperation = venueData.hoursOfOperation;
    if (venueData.amenities) updateData.amenities = venueData.amenities;
    if (venueData.settings) updateData.settings = venueData.settings;
    
    // Always update these fields
    updateData.slug = slug;
    updateData.updatedAt = serverTimestamp();
    
    console.log('Final update data:', updateData);
    
    // Perform the update
    await updateDoc(venueRef, updateData);
    console.log('Venue updated successfully');
    
    // Update categories if changed
    if (venueData.categories && 
        JSON.stringify(venueData.categories) !== JSON.stringify(currentData.categories)) {
      
      // Decrement old categories
      if (currentData.categories && currentData.categories.length > 0) {
        for (const categoryName of currentData.categories) {
          const categoriesQuery = query(
            collection(db, 'categories'),
            where('name', '==', categoryName)
          );
          
          const categorySnap = await getDocs(categoriesQuery);
          
          if (!categorySnap.empty) {
            const categoryDoc = categorySnap.docs[0];
            await updateDoc(categoryDoc.ref, {
              venueCount: Math.max(0, (categoryDoc.data().venueCount || 0) - 1)
            });
          }
        }
      }
      
      // Increment new categories
      if (venueData.categories && venueData.categories.length > 0) {
        for (const categoryName of venueData.categories) {
          // Skip categories that are in both old and new arrays
          if (currentData.categories && currentData.categories.includes(categoryName)) {
            continue;
          }
          
          const categoriesQuery = query(
            collection(db, 'categories'),
            where('name', '==', categoryName)
          );
          
          const categorySnap = await getDocs(categoriesQuery);
          
          if (!categorySnap.empty) {
            const categoryDoc = categorySnap.docs[0];
            await updateDoc(categoryDoc.ref, {
              venueCount: (categoryDoc.data().venueCount || 0) + 1
            });
          }
        }
      }
    }
    
    // Update venue name in events for this venue
    if (venueData.name && venueData.name !== currentData.name) {
      const eventsQuery = query(
        collection(db, 'events'),
        where('venueId', '==', venueId)
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      
      // Update each event with the new venue name
      const updatePromises = eventsSnapshot.docs.map(eventDoc => {
        return updateDoc(eventDoc.ref, {
          venueName: venueData.name
        });
      });
      
      await Promise.all(updatePromises);
    }
    
  } catch (error) {
    console.error('Error updating venue:', error);
    throw error;
  }
};

/**
 * Delete a venue
 * @param {string} venueId - Venue ID
 * @returns {Promise<void>}
 */
export const deleteVenue = async (venueId) => {
  try {
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (!venueSnap.exists()) {
      throw new Error('Venue not found');
    }
    
    const venueData = venueSnap.data();
    
    // Check if venue has events
    const eventsQuery = query(
      collection(db, 'events'),
      where('venueId', '==', venueId)
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (!eventsSnapshot.empty) {
      throw new Error('Cannot delete venue with associated events');
    }
    
    // Delete the venue document
    await deleteDoc(venueRef);
    
    // Update category counts
    if (venueData.categories && venueData.categories.length > 0) {
      for (const categoryName of venueData.categories) {
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('name', '==', categoryName)
        );
        
        const categorySnap = await getDocs(categoriesQuery);
        
        if (!categorySnap.empty) {
          const categoryDoc = categorySnap.docs[0];
          await updateDoc(categoryDoc.ref, {
            venueCount: Math.max(0, (categoryDoc.data().venueCount || 0) - 1)
          });
        }
      }
    }
    
    // Delete all reviews for this venue
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('targetId', '==', venueId),
      where('targetType', '==', 'venue')
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviewDeletePromises = reviewsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(reviewDeletePromises);
    
    // Delete followers
    const followersQuery = query(
      collection(db, 'followers'),
      where('followeeId', '==', venueId),
      where('followeeType', '==', 'venue')
    );
    
    const followersSnapshot = await getDocs(followersQuery);
    const followerDeletePromises = followersSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(followerDeletePromises);
    
    // Update the owner's venue reference
    const userQuery = query(
      collection(db, 'users'),
      where('venueId', '==', venueId)
    );
    
    const userSnapshot = await getDocs(userQuery);
    
    userSnapshot.forEach(userDoc => {
      updateDoc(userDoc.ref, {
        venueId: null,
        isVenueAccount: false
      });
    });
    
    // Delete venue images from storage
    const venueImagesRef = ref(storage, `venues/${venueId}`);
    try {
      const listResult = await listAll(venueImagesRef);
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting venue images:', error);
      // Continue with deletion even if image deletion fails
    }
  } catch (error) {
    console.error('Error deleting venue:', error);
    throw error;
  }
};

/**
 * Get nearby venues
 * @param {Object} location - Location object with latitude and longitude
 * @param {number} distance - Distance in kilometers
 * @param {number} limit - Maximum number of venues to return
 * @param {Array} categories - Optional categories to filter by
 * @returns {Promise<Array>} Array of venues
 */
export const getNearbyVenues = async (location, distance = 10, limit = 10, categories = []) => {
  try {
    if (!location || !location.latitude || !location.longitude) {
      throw new Error('Invalid location');
    }
    
    // Query all active venues
    const venuesQuery = query(
      collection(db, 'venues'),
      where('status', '==', 'active'),
      limit(100) // Get a larger batch to filter client-side
    );
    
    const snapshot = await getDocs(venuesQuery);
    const venues = [];
    
    snapshot.forEach(doc => {
      venues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Filter venues by distance
    const filteredVenues = venues.filter(venue => {
      if (!venue.location || !venue.location.geopoint) return false;
      
      const venueLocation = venue.location.geopoint;
      const distanceKm = calculateDistance(
        location.latitude,
        location.longitude,
        venueLocation.latitude,
        venueLocation.longitude
      );
      
      // Add distance to venue object
      venue.distance = distanceKm;
      
      return distanceKm <= distance;
    });
    
    // Filter by categories if provided
    let result = filteredVenues;
    if (categories && categories.length > 0) {
      result = result.filter(venue => {
        if (!venue.categories) return false;
        return categories.some(category => venue.categories.includes(category));
      });
    }
    
    // Sort by distance and limit results
    return result
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting nearby venues:', error);
    throw error;
  }
};

/**
 * Submit a review for a venue
 * @param {string} venueId - Venue ID
 * @param {string} userId - User ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<string>} ID of created review
 */
export const submitVenueReview = async (venueId, userId, reviewData) => {
  try {
    // Get venue data
    const venueRef = doc(db, 'venues', venueId);
    const venueSnap = await getDoc(venueRef);
    
    if (!venueSnap.exists()) {
      throw new Error('Venue not found');
    }
    
    const venueData = venueSnap.data();
    
    // Get user data
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    
    // Check if user has already reviewed this venue
    const existingReviewQuery = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      where('targetId', '==', venueId),
      where('targetType', '==', 'venue')
    );
    
    const existingReviewSnapshot = await getDocs(existingReviewQuery);
    
    if (!existingReviewSnapshot.empty) {
      throw new Error('You have already reviewed this venue');
    }
    
    // Create review document
    const reviewsRef = collection(db, 'reviews');
    const docRef = doc(reviewsRef);
    
    const newReview = {
      userId,
      userName: userData.displayName || '',
      userPhotoURL: userData.photoURL || '',
      targetId: venueId,
      targetType: 'venue',
      targetName: venueData.name || '',
      rating: reviewData.rating || 5,
      title: reviewData.title || '',
      content: reviewData.content || '',
      photos: reviewData.photos || [],
      helpful: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'published'
    };
    
    await setDoc(docRef, newReview);
    
    // Update venue ratings
    const ratingDistribution = { ...venueData.ratings.distribution };
    ratingDistribution[reviewData.rating] = (ratingDistribution[reviewData.rating] || 0) + 1;
    
    // Calculate new average rating
    const totalRatings = venueData.ratings.count + 1;
    const totalScore = venueData.ratings.average * venueData.ratings.count + reviewData.rating;
    const newAverage = totalScore / totalRatings;
    
    await updateDoc(venueRef, {
      'ratings.average': newAverage,
      'ratings.count': totalRatings,
      'ratings.distribution': ratingDistribution
    });
    
    // Update user review count
    await updateDoc(userRef, {
      'stats.reviews': (userData.stats?.reviews || 0) + 1
    });
    
    // Notify venue owner
    if (venueData.ownerId) {
      const notificationsRef = collection(db, 'notifications');
      const notificationData = {
        userId: venueData.ownerId,
        type: 'venue_review',
        title: 'New Review',
        message: `${userData.displayName || 'Someone'} left a review on your venue`,
        sourceId: docRef.id,
        sourceType: 'review',
        read: false,
        createdAt: serverTimestamp(),
        expiresAt: null
      };
      
      await setDoc(doc(notificationsRef), notificationData);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error submitting venue review:', error);
    throw error;
  }
};

/**
 * Get reviews for a venue
 * @param {string} venueId - Venue ID
 * @param {number} limit - Maximum number of reviews to return
 * @param {string} sort - Sort order: 'recent' or 'helpful'
 * @returns {Promise<Array>} Array of review objects
 */
export const getVenueReviews = async (venueId, limit = 10, sort = 'recent') => {
  try {
    let reviewsQuery;
    
    if (sort === 'helpful') {
      reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetId', '==', venueId),
        where('targetType', '==', 'venue'),
        where('status', '==', 'published'),
        orderBy('helpful', 'desc'),
        limit
      );
    } else {
      reviewsQuery = query(
        collection(db, 'reviews'),
        where('targetId', '==', venueId),
        where('targetType', '==', 'venue'),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit
      );
    }
    
    const snapshot = await getDocs(reviewsQuery);
    const reviews = [];
    
    snapshot.forEach(doc => {
      reviews.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return reviews;
  } catch (error) {
    console.error('Error getting venue reviews:', error);
    throw error;
  }
};

/**
 * Get featured venues
 * @param {number} limit - Maximum number of venues to return
 * @returns {Promise<Array>} Array of featured venues
 */
export const getFeaturedVenues = async (limit = 6) => {
  try {
    const venuesQuery = query(
      collection(db, 'venues'),
      where('featured', '==', true),
      where('status', '==', 'active'),
      limit
    );
    
    const snapshot = await getDocs(venuesQuery);
    const venues = [];
    
    snapshot.forEach(doc => {
      venues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return venues;
  } catch (error) {
    console.error('Error getting featured venues:', error);
    throw error;
  }
};

/**
 * Search venues by text query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of matching venues
 */
export const searchVenues = async (query, limit = 20) => {
  try {
    // This is a simple implementation that gets active venues and filters client-side
    // For production, you would use Firestore's array-contains with keywords or a search service like Algolia
    const venuesQuery = query(
      collection(db, 'venues'),
      where('status', '==', 'active'),
      limit(100)
    );
    
    const snapshot = await getDocs(venuesQuery);
    const venues = [];
    
    snapshot.forEach(doc => {
      venues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    const queryLower = query.toLowerCase();
    
    // Filter venues by query
    const filteredVenues = venues.filter(venue => {
      const nameMatch = venue.name && venue.name.toLowerCase().includes(queryLower);
      const descriptionMatch = venue.description && venue.description.toLowerCase().includes(queryLower);
      const addressMatch = venue.location && venue.location.address && 
        venue.location.address.toLowerCase().includes(queryLower);
      const categoryMatch = venue.categories && venue.categories.some(
        category => category.toLowerCase().includes(queryLower)
      );
      
      return nameMatch || descriptionMatch || addressMatch || categoryMatch;
    });
    
    return filteredVenues.slice(0, limit);
  } catch (error) {
    console.error('Error searching venues:', error);
    throw error;
  }
};

/**
 * Get venues by category
 * @param {string} category - Category name
 * @param {number} limit - Maximum number of venues to return
 * @returns {Promise<Array>} Array of venues in the category
 */
export const getVenuesByCategory = async (category, limit = 20) => {
  try {
    const venuesQuery = query(
      collection(db, 'venues'),
      where('categories', 'array-contains', category),
      where('status', '==', 'active'),
      limit
    );
    
    const snapshot = await getDocs(venuesQuery);
    const venues = [];
    
    snapshot.forEach(doc => {
      venues.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return venues;
  } catch (error) {
    console.error('Error getting venues by category:', error);
    throw error;
  }
};

/**
 * Get venue followers count
 * @param {string} venueId - Venue ID
 * @returns {Promise<number>} Number of followers
 */
export const getVenueFollowersCount = async (venueId) => {
  try {
    const followersQuery = query(
      collection(db, 'followers'),
      where('followeeId', '==', venueId),
      where('followeeType', '==', 'venue')
    );
    
    const snapshot = await getDocs(followersQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting venue followers count:', error);
    throw error;
  }
};

/**
 * Check if a user is following a venue
 * @param {string} userId - User ID
 * @param {string} venueId - Venue ID
 * @returns {Promise<boolean>} Whether the user is following the venue
 */
export const isFollowingVenue = async (userId, venueId) => {
  try {
    const followQuery = query(
      collection(db, 'followers'),
      where('followerId', '==', userId),
      where('followeeId', '==', venueId),
      where('followeeType', '==', 'venue'),
      limit(1)
    );
    
    const snapshot = await getDocs(followQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if following venue:', error);
    throw error;
  }
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Create a URL-friendly slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};