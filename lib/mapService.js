// Map Service Integration for Happen Platform
// This file contains utilities for working with maps and geolocation

/**
 * Initialize a map instance
 * @param {HTMLElement} container - DOM element to render the map
 * @param {Object} options - Map initialization options
 * @returns {Object} Map instance
 */
export const initializeMap = (container, options = {}) => {
  // This is a placeholder - we'll implement with actual map library later
  // We'll use Mapbox or Google Maps based on final decision
  console.log('Map initialization placeholder');
  return {
    container,
    options,
    setCenter: (center) => console.log('Setting center to', center),
    setZoom: (zoom) => console.log('Setting zoom to', zoom),
    addMarker: (coords) => console.log('Adding marker at', coords),
    remove: () => console.log('Removing map instance')
  };
};

/**
 * Add event markers to a map
 * @param {Object} map - Map instance
 * @param {Array} events - Array of event objects with location data
 * @returns {Array} Array of created markers
 */
export const addEventMarkers = (map, events) => {
  // This is a placeholder - we'll implement with actual map library later
  console.log('Adding', events.length, 'event markers to map');
  return events.map(event => ({
    id: event.id,
    position: event.location,
    map
  }));
};

/**
 * Get the user's current location
 * @returns {Promise<{latitude: number, longitude: number}>} User's coordinates
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};

/**
 * Calculate distance between two coordinates in kilometers
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine formula to calculate distance between two points
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
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
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<{latitude: number, longitude: number}>} Coordinates
 */
export const geocodeAddress = async (address) => {
  // This is a placeholder - we'll implement with actual geocoding service later
  console.log('Geocoding address:', address);
  // Mock response for now
  return {
    latitude: 40.7128,
    longitude: -74.0060
  };
};

/**
 * Reverse geocode coordinates to an address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} Address
 */
export const reverseGeocode = async (latitude, longitude) => {
  // This is a placeholder - we'll implement with actual geocoding service later
  console.log('Reverse geocoding:', latitude, longitude);
  // Mock response for now
  return '123 Example Street, New York, NY 10001';
};
