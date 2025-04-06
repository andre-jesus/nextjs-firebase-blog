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
import { db, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Create a new event
 * @param {Object} eventData - Event data
 * @param {string} userId - User ID of creator
 * @returns {Promise<string>} ID of created event
 */
export const createEvent = async (eventData, userId) => {
  try {
    const eventsRef = collection(db, 'events');
    const docRef = doc(eventsRef);
    const eventId = docRef.id;
    
    // Get venue data if venueId is provided
    let venueName = eventData.venueName;
    if (eventData.venueId && !venueName) {
      const venueDoc = await getDoc(doc(db, 'venues', eventData.venueId));
      if (venueDoc.exists()) {
        venueName = venueDoc.data().name;
      }
    }
    
    // Process location data to ensure it has a GeoPoint
    let locationData = eventData.location || {};
    if (locationData.latitude && locationData.longitude) {
      locationData.geopoint = new GeoPoint(locationData.latitude, locationData.longitude);
    }
    
    // Create slug from name
    const slug = createSlug(eventData.name);
    
    // Prepare event data for storage
    const newEventData = {
      ...eventData,
      slug,
      creatorId: userId,
      venueName,
      location: locationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      attendeeCount: 0,
      interestedCount: 0,
      viewCount: 0,
      status: eventData.status || 'scheduled'
    };
    
    // Remove any undefined fields
    Object.keys(newEventData).forEach(key => {
      if (newEventData[key] === undefined) {
        delete newEventData[key];
      }
    });
    
    // Save the event
    await setDoc(docRef, newEventData);
    
    // Create activity record for venue
    if (eventData.venueId) {
      const activitiesRef = collection(db, 'activities');
      await setDoc(doc(activitiesRef), {
        venueId: eventData.venueId,
        type: 'event_created',
        message: `New event created: ${eventData.name}`,
        timestamp: serverTimestamp(),
        entityId: eventId,
        entityType: 'event',
        userId
      });
    }
    
    return eventId;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Get an event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event data
 */
export const getEvent = async (eventId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (eventSnap.exists()) {
      return {
        id: eventSnap.id,
        ...eventSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting event:', error);
    throw error;
  }
};

/**
 * Get event by slug
 * @param {string} slug - Event slug
 * @returns {Promise<Object>} Event data
 */
export const getEventBySlug = async (slug) => {
  try {
    const eventsQuery = query(
      collection(db, 'events'),
      where('slug', '==', slug),
      limit(1)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    
    if (!querySnapshot.empty) {
      const eventDoc = querySnapshot.docs[0];
      return {
        id: eventDoc.id,
        ...eventDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting event by slug:', error);
    throw error;
  }
};

/**
 * Update an event
 * @param {string} eventId - Event ID
 * @param {Object} eventData - Updated event data
 * @returns {Promise<void>}
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const currentData = eventSnap.data();
    
    // Get venue data if venueId is provided and different from current
    let venueName = eventData.venueName;
    if (eventData.venueId && eventData.venueId !== currentData.venueId) {
      const venueDoc = await getDoc(doc(db, 'venues', eventData.venueId));
      if (venueDoc.exists()) {
        venueName = venueDoc.data().name;
      }
    }
    
    // Process location data
    let locationData = eventData.location || currentData.location || {};
    if (locationData.latitude && locationData.longitude) {
      locationData.geopoint = new GeoPoint(locationData.latitude, locationData.longitude);
    }
    
    // Update slug if name changed
    let slug = currentData.slug;
    if (eventData.name && eventData.name !== currentData.name) {
      slug = createSlug(eventData.name);
    }
    
    // Prepare update data
    const updateData = {
      ...eventData,
      slug,
      venueName,
      location: locationData,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(eventRef, updateData);
    
    // Create activity record for venue
    if (currentData.venueId) {
      const activitiesRef = collection(db, 'activities');
      await setDoc(doc(activitiesRef), {
        venueId: currentData.venueId,
        type: 'event_updated',
        message: `Event updated: ${eventData.name || currentData.name}`,
        timestamp: serverTimestamp(),
        entityId: eventId,
        entityType: 'event'
      });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventSnap.data();
    
    // Delete the event document
    await deleteDoc(eventRef);
    
    // Delete all RSVPs for this event
    const rsvpsQuery = query(
      collection(db, 'rsvps'),
      where('eventId', '==', eventId)
    );
    
    const rsvpsSnapshot = await getDocs(rsvpsQuery);
    const rsvpDeletePromises = rsvpsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(rsvpDeletePromises);
    
    // Delete event images from storage
    if (eventData.coverImage) {
      try {
        // Try to delete cover image
        const imagePath = eventData.coverImage.split('?')[0]; // Remove query params
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Error deleting event cover image:', error);
        // Continue with deletion even if image deletion fails
      }
    }
    
    // Create activity record for venue
    if (eventData.venueId) {
      const activitiesRef = collection(db, 'activities');
      await setDoc(doc(activitiesRef), {
        venueId: eventData.venueId,
        type: 'event_deleted',
        message: `Event deleted: ${eventData.name}`,
        timestamp: serverTimestamp(),
        entityId: eventId,
        entityType: 'event'
      });
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Get upcoming events
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} Array of upcoming events
 */
export const getUpcomingEvents = async (maxLimit = 12) => {
  try {
    const now = new Date();
    
    const eventsQuery = query(
      collection(db, 'events'),
      where('startDateTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startDateTime', 'asc'),
      limit(maxLimit)
    );
    
    const snapshot = await getDocs(eventsQuery);
    const events = [];
    
    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw error;
  }
};

/**
 * Get events by venue
 * @param {string} venueId - Venue ID
 * @param {string} status - Event status to filter by
 * @param {number} maxLimit - Maximum number of events to return
 * @returns {Promise<Array>} Array of events
 */
export const getEventsByVenue = async (venueId, status = 'all', maxLimit = 12) => {
  try {
    let eventsQuery;
    const now = new Date();
    
    if (status === 'upcoming') {
      eventsQuery = query(
        collection(db, 'events'),
        where('venueId', '==', venueId),
        where('startDateTime', '>=', now),
        orderBy('startDateTime', 'asc'),
        limit(maxLimit)
      );
    } else if (status === 'past') {
      eventsQuery = query(
        collection(db, 'events'),
        where('venueId', '==', venueId),
        where('startDateTime', '<', now),
        orderBy('startDateTime', 'desc'),
        limit(maxLimit)
      );
    } else if (status === 'draft') {
      eventsQuery = query(
        collection(db, 'events'),
        where('venueId', '==', venueId),
        where('status', '==', 'draft'),
        orderBy('updatedAt', 'desc'),
        limit(maxLimit)
      );
    } else {
      // All events for this venue
      eventsQuery = query(
        collection(db, 'events'),
        where('venueId', '==', venueId),
        orderBy('startDateTime', 'desc'),
        limit(maxLimit)
      );
    }
    
    const snapshot = await getDocs(eventsQuery);
    const events = [];
    
    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting events by venue:', error);
    throw error;
  }
};

/**
 * Get events by category
 * @param {string} category - Category name
 * @param {number} maxLimit - Maximum number of events to return
 * @returns {Promise<Array>} Array of events
 */
export const getEventsByCategory = async (category, maxLimit = 12) => {
  try {
    const now = new Date();
    
    const eventsQuery = query(
      collection(db, 'events'),
      where('categories', 'array-contains', category),
      where('startDateTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startDateTime', 'asc'),
      limit(maxLimit)
    );
    
    const snapshot = await getDocs(eventsQuery);
    const events = [];
    
    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return events;
  } catch (error) {
    console.error('Error getting events by category:', error);
    throw error;
  }
};

/**
 * Get nearby events
 * @param {Object} location - Location object with latitude and longitude
 * @param {number} distance - Distance in kilometers
 * @param {number} maxLimit - Maximum number of events to return
 * @returns {Promise<Array>} Array of events
 */
export const getNearbyEvents = async (location, distance = 10, maxLimit = 12) => {
  try {
    if (!location || !location.latitude || !location.longitude) {
      throw new Error('Invalid location');
    }
    
    const now = new Date();
    
    // Query all upcoming events
    const eventsQuery = query(
      collection(db, 'events'),
      where('startDateTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startDateTime', 'asc'),
      limit(50) // Get a larger batch to filter client-side
    );
    
    const snapshot = await getDocs(eventsQuery);
    const events = [];
    
    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Filter events by distance
    const filteredEvents = events.filter(event => {
      if (!event.location || !event.location.geopoint) return false;
      
      const eventLocation = event.location.geopoint;
      const distanceKm = calculateDistance(
        location.latitude,
        location.longitude,
        eventLocation.latitude,
        eventLocation.longitude
      );
      
      // Add distance to event object
      event.distance = distanceKm;
      
      return distanceKm <= distance;
    });
    
    // Sort by distance and limit results
    return filteredEvents
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxLimit);
  } catch (error) {
    console.error('Error getting nearby events:', error);
    throw error;
  }
};

/**
 * Search events by text query
 * @param {string} query - Search query
 * @param {number} maxLimit - Maximum number of results to return
 * @returns {Promise<Array>} Array of matching events
 */
export const searchEvents = async (query, maxLimit = 20) => {
  try {
    // This is a simple implementation that gets events and filters client-side
    // For production, you would use Firestore's array-contains with keywords or a search service like Algolia
    const now = new Date();
    
    const eventsQuery = query(
      collection(db, 'events'),
      where('startDateTime', '>=', now),
      where('status', '==', 'scheduled'),
      orderBy('startDateTime', 'asc'),
      limit(100)
    );
    
    const snapshot = await getDocs(eventsQuery);
    const events = [];
    
    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    const queryLower = query.toLowerCase();
    
    // Filter events by query
    const filteredEvents = events.filter(event => {
      const nameMatch = event.name && event.name.toLowerCase().includes(queryLower);
      const descriptionMatch = event.description && event.description.toLowerCase().includes(queryLower);
      const venueMatch = event.venueName && event.venueName.toLowerCase().includes(queryLower);
      const addressMatch = event.location && event.location.address && 
        event.location.address.toLowerCase().includes(queryLower);
      const categoryMatch = event.categories && event.categories.some(
        category => category.toLowerCase().includes(queryLower)
      );
      
      return nameMatch || descriptionMatch || venueMatch || addressMatch || categoryMatch;
    });
    
    return filteredEvents.slice(0, maxLimit);
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
};

/**
 * RSVP to an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} responseType - RSVP response ('going', 'interested', 'not_going')
 * @returns {Promise<string>} ID of created RSVP
 */
export const createEventRSVP = async (eventId, userId, responseType) => {
  try {
    // Get event data
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventSnap.data();
    
    // Check if user has already RSVP'd to this event
    const existingRSVPQuery = query(
      collection(db, 'rsvps'),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
    
    const existingRSVPSnapshot = await getDocs(existingRSVPQuery);
    let rsvpId;
    
    if (!existingRSVPSnapshot.empty) {
      // Update existing RSVP
      const existingRSVP = existingRSVPSnapshot.docs[0];
      const oldResponse = existingRSVP.data().responseType;
      
      // Update stats if response type changed
      if (oldResponse !== responseType) {
        // Decrement previous response count
        if (oldResponse === 'going') {
          await updateDoc(eventRef, {
            attendeeCount: Math.max(0, (eventData.attendeeCount || 0) - 1)
          });
        } else if (oldResponse === 'interested') {
          await updateDoc(eventRef, {
            interestedCount: Math.max(0, (eventData.interestedCount || 0) - 1)
          });
        }
        
        // Increment new response count
        if (responseType === 'going') {
          await updateDoc(eventRef, {
            attendeeCount: (eventData.attendeeCount || 0) + 1
          });
        } else if (responseType === 'interested') {
          await updateDoc(eventRef, {
            interestedCount: (eventData.interestedCount || 0) + 1
          });
        }
      }
      
      // Update RSVP record
      await updateDoc(existingRSVP.ref, {
        responseType,
        updatedAt: serverTimestamp()
      });
      
      rsvpId = existingRSVP.id;
    } else {
      // Create new RSVP record
      const rsvpsRef = collection(db, 'rsvps');
      const docRef = doc(rsvpsRef);
      
      await setDoc(docRef, {
        eventId,
        userId,
        responseType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update event stats
      if (responseType === 'going') {
        await updateDoc(eventRef, {
          attendeeCount: (eventData.attendeeCount || 0) + 1
        });
      } else if (responseType === 'interested') {
        await updateDoc(eventRef, {
          interestedCount: (eventData.interestedCount || 0) + 1
        });
      }
      
      rsvpId = docRef.id;
    }
    
    // Create activity record for venue
    if (eventData.venueId && responseType === 'going') {
      const activitiesRef = collection(db, 'activities');
      await setDoc(doc(activitiesRef), {
        venueId: eventData.venueId,
        type: 'event_rsvp',
        message: `New RSVP for event: ${eventData.name}`,
        timestamp: serverTimestamp(),
        entityId: eventId,
        entityType: 'event',
        userId
      });
    }
    
    return rsvpId;
  } catch (error) {
    console.error('Error creating event RSVP:', error);
    throw error;
  }
};

/**
 * Get user's RSVP for an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} RSVP data or null if not found
 */
export const getUserEventRSVP = async (eventId, userId) => {
  try {
    const rsvpQuery = query(
      collection(db, 'rsvps'),
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      limit(1)
    );
    
    const snapshot = await getDocs(rsvpQuery);
    
    if (!snapshot.empty) {
      const rsvpDoc = snapshot.docs[0];
      return {
        id: rsvpDoc.id,
        ...rsvpDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user event RSVP:', error);
    throw error;
  }
};

/**
 * Get event attendees
 * @param {string} eventId - Event ID
 * @param {number} maxLimit - Maximum number of attendees to return
 * @returns {Promise<Array>} Array of user objects who are attending
 */
export const getEventAttendees = async (eventId, maxLimit = 20) => {
  try {
    const attendeesQuery = query(
      collection(db, 'rsvps'),
      where('eventId', '==', eventId),
      where('responseType', '==', 'going'),
      limit(maxLimit)
    );
    
    const snapshot = await getDocs(attendeesQuery);
    const userIds = snapshot.docs.map(doc => doc.data().userId);
    
    // Get user details
    const userPromises = userIds.map(userId => {
      const userRef = doc(db, 'users', userId);
      return getDoc(userRef).then(userSnap => {
        if (userSnap.exists()) {
          return {
            id: userSnap.id,
            ...userSnap.data()
          };
        }
        return null;
      });
    });
    
    const users = await Promise.all(userPromises);
    return users.filter(Boolean); // Remove null entries
  } catch (error) {
    console.error('Error getting event attendees:', error);
    throw error;
  }
};

/**
 * Upload an event image
 * @param {File} file - Image file
 * @param {string} eventId - Event ID
 * @returns {Promise<string>} URL of uploaded image
 */
export const uploadEventImage = async (file, eventId) => {
  try {
    // Generate a completely random filename without using the original name
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const storagePath = `events/${eventId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress updates if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          // Handle error
          console.error('Error uploading image:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Error uploading event image:', error);
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