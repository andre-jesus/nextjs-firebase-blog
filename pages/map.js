import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initializeMap, addEventMarkers, getUserLocation } from '../lib/mapService';

// Placeholder component for EventCard until we create the real one
const EventCard = ({ event }) => {
  // Format date simply for now
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {event.coverImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={event.coverImage}
            alt={event.name}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      )}
      <div className="p-4">
        <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
          {formatDate(event.startDateTime)}
        </div>
        <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
          <Link href={`/events/${event.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {event.name}
          </Link>
        </h2>
        <div className="text-gray-600 dark:text-gray-400 mb-2 text-sm">
          {event.venueName || (event.location && event.location.address)}
        </div>
        {event.categories && event.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {event.categories.slice(0, 2).map(category => (
              <span 
                key={category} 
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
              >
                {category}
              </span>
            ))}
            {event.categories.length > 2 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                +{event.categories.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple filter component
const EventFilters = ({ filters, onChange }) => {
  const categories = [
    'Music', 'Food', 'Art', 'Sports', 'Technology', 
    'Outdoors', 'Networking', 'Community', 'Education', 'Entertainment'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="font-medium mb-4">Filters</h3>
      
      {/* Categories */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Categories</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              className={`px-3 py-1 text-sm rounded-full ${
                filters.categories.includes(category)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
              onClick={() => {
                const newCategories = filters.categories.includes(category)
                  ? filters.categories.filter(c => c !== category)
                  : [...filters.categories, category];
                
                onChange({ ...filters, categories: newCategories });
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Date filters */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">When</h4>
        <div className="flex flex-wrap gap-2">
          {['Today', 'This Week', 'This Weekend', 'Next Week'].map(timeFrame => (
            <button
              key={timeFrame}
              className={`px-3 py-1 text-sm rounded-full ${
                filters.timeFrame === timeFrame
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
              onClick={() => onChange({ ...filters, timeFrame })}
            >
              {timeFrame}
            </button>
          ))}
        </div>
      </div>
      
      {/* Distance slider */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Distance: {filters.distance} km</h4>
        <input
          type="range"
          min="1"
          max="50"
          value={filters.distance}
          onChange={(e) => onChange({ ...filters, distance: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
      
      {/* Reset button */}
      <button
        className="w-full mt-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        onClick={() => onChange({
          categories: [],
          timeFrame: 'This Week',
          distance: 10
        })}
      >
        Reset Filters
      </button>
    </div>
  );
};

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    categories: [],
    timeFrame: 'This Week',
    distance: 10
  });

  // Get user location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };

    getLocation();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !userLocation) return;
    
    const mapOptions = {
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 12
    };
    
    // This is a placeholder - in a real map implementation, we would initialize the map here
    console.log('Initializing map with options:', mapOptions);
    
    // Example code for map initialization (not functional without library)
    /*
    const map = initializeMap(mapContainerRef.current, mapOptions);
    
    // Add markers for events
    if (events.length > 0) {
      addEventMarkers(map, events);
    }
    
    // Clean up function
    return () => {
      map.remove();
    };
    */
  }, [userLocation, events]);

  // Fetch events based on filters
  useEffect(() => {
    const fetchEvents = async () => {
      if (!userLocation) return;
      
      setLoading(true);
      try {
        // Determine date range based on timeFrame
        const startDate = new Date();
        let endDate = new Date();
        
        switch (filters.timeFrame) {
          case 'Today':
            // Just today
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'This Week':
            // Next 7 days
            endDate.setDate(endDate.getDate() + 7);
            break;
          case 'This Weekend':
            // Next Friday to Sunday
            const day = startDate.getDay(); // 0 = Sunday, 6 = Saturday
            const daysUntilFriday = day <= 5 ? 5 - day : 6;
            const friday = new Date(startDate);
            friday.setDate(friday.getDate() + daysUntilFriday);
            friday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(friday);
            sunday.setDate(sunday.getDate() + 2);
            sunday.setHours(23, 59, 59, 999);
            
            if (startDate > friday) {
              // It's already the weekend
              endDate = sunday;
            } else {
              // Weekend is coming up
              startDate.setTime(friday.getTime());
              endDate = sunday;
            }
            break;
          case 'Next Week':
            // 7-14 days from now
            startDate.setDate(startDate.getDate() + 7);
            endDate.setDate(endDate.getDate() + 14);
            break;
        }
        
        // Query events within the date range
        const eventsQuery = query(
          collection(db, 'events'),
          where('startDateTime', '>=', Timestamp.fromDate(startDate)),
          where('startDateTime', '<=', Timestamp.fromDate(endDate)),
          where('status', '==', 'scheduled'),
          orderBy('startDateTime', 'asc'),
          limit(50)
        );

        const snapshot = await getDocs(eventsQuery);
        let eventList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter by categories if any are selected
        if (filters.categories.length > 0) {
          eventList = eventList.filter(event => {
            if (!event.categories) return false;
            return event.categories.some(category => filters.categories.includes(category));
          });
        }
        
        // Filter by distance
        eventList = eventList.filter(event => {
          if (!event.location || !event.location.geopoint) return false;
          
          // In a real implementation, we would calculate the actual distance
          // For now, just pretend all events are within range
          return true;
        });
        
        setEvents(eventList);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userLocation, filters]);

  return (
    <div>
      <Head>
        <title>Event Map | Happen</title>
        <meta name="description" content="Discover events near you on the map" />
      </Head>

      <div className="h-screen flex flex-col">
        <div className="flex-grow flex">
          {/* Sidebar */}
          <div className="w-full md:w-96 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Discover Events</h1>
            
            {/* Filters */}
            <div className="mb-4">
              <EventFilters filters={filters} onChange={setFilters} />
            </div>
            
            {/* Event list */}
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-3">
                {loading ? 'Loading events...' : `${events.length} Events Found`}
              </h2>
              
              {!loading && events.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-600 dark:text-gray-300">No events found with your filters</p>
                </div>
              )}
              
              <div className="space-y-4">
                {events.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => setSelectedEvent(event)}
                    className={`cursor-pointer ${selectedEvent?.id === event.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Map */}
          <div className="hidden md:block flex-grow relative">
            {/* Placeholder map UI */}
            <div 
              ref={mapContainerRef}
              className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            >
              <div className="text-center p-8">
                <h3 className="text-xl font-medium mb-4">Map Visualization Coming Soon</h3>
                <p className="mb-4">
                  This is a placeholder for the interactive map that will show events in your area.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In the fully implemented version, you'll see events as markers on the map.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
