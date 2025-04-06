import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';

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
      <div className="p-5">
        <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
          {formatDate(event.startDateTime)}
        </div>
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          <Link href={`/events/${event.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {event.name}
          </Link>
        </h2>
        <div className="text-gray-600 dark:text-gray-400 mb-3">
          {event.venueName || (event.location && event.location.address)}
        </div>
        {event.shortDescription && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{event.shortDescription}</p>
        )}
        <div className="flex justify-between items-center mt-4">
          {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.categories.map(category => (
                <span 
                  key={category} 
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple category filter component
const CategoryFilter = ({ selectedCategories, onChange }) => {
  const categories = [
    'Music', 'Food', 'Art', 'Sports', 'Technology', 
    'Outdoors', 'Networking', 'Community', 'Education', 'Entertainment'
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">Categories</h3>
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedCategories.includes(category)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
            onClick={() => {
              const newCategories = selectedCategories.includes(category)
                ? selectedCategories.filter(c => c !== category)
                : [...selectedCategories, category];
              
              onChange(newCategories);
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

// Simple date filter component
const DateFilter = ({ selectedTimeFrame, onChange }) => {
  const timeFrames = [
    { id: 'all', label: 'All Upcoming' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'weekend', label: 'This Weekend' },
    { id: 'month', label: 'This Month' }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">When</h3>
      <div className="flex flex-wrap gap-2">
        {timeFrames.map(timeFrame => (
          <button
            key={timeFrame.id}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTimeFrame === timeFrame.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
            onClick={() => onChange(timeFrame.id)}
          >
            {timeFrame.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function EventsPage() {
  const [user] = useAuthState(auth);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date ranges based on time frame
  const getDateRange = (timeFrame) => {
    const startDate = new Date();
    let endDate = new Date();
    
    switch (timeFrame) {
      case 'today':
        // Just today
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // Next 7 days
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'weekend':
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
      case 'month':
        // Next 30 days
        endDate.setDate(endDate.getDate() + 30);
        break;
      default:
        // All upcoming (next 6 months)
        endDate.setMonth(endDate.getMonth() + 6);
    }
    
    return { startDate, endDate };
  };

  // Fetch events based on filters
  const fetchEvents = async (loadMore = false) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(selectedTimeFrame);
      
      // Base query
      let eventsQuery = query(
        collection(db, 'events'),
        where('startDateTime', '>=', Timestamp.fromDate(startDate)),
        where('startDateTime', '<=', Timestamp.fromDate(endDate)),
        where('status', '==', 'scheduled'),
        orderBy('startDateTime', 'asc'),
        limit(12)
      );
      
      // Add pagination
      if (loadMore && lastVisible) {
        eventsQuery = query(
          eventsQuery,
          startAfter(lastVisible)
        );
      } else {
        // Reset pagination for new filters
        setLastVisible(null);
      }

      const snapshot = await getDocs(eventsQuery);
      
      // Get last document for pagination
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      // Check if there are more events to load
      setHasMore(snapshot.docs.length === 12);
      
      // Process results
      const eventList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply category filter client-side
      let filteredEvents = eventList;
      if (selectedCategories.length > 0) {
        filteredEvents = eventList.filter(event => 
          event.categories && event.categories.some(category => 
            selectedCategories.includes(category)
          )
        );
      }
      
      // Update or append events
      if (loadMore) {
        setEvents(prev => [...prev, ...filteredEvents]);
      } else {
        setEvents(filteredEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [selectedCategories, selectedTimeFrame]);

  // Load more events
  const handleLoadMore = () => {
    fetchEvents(true);
  };

  return (
    <div>
      <Head>
        <title>Browse Events | Happen</title>
        <meta name="description" content="Discover and browse upcoming events" />
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Discover Events</h1>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              Filters
            </button>
            
            <Link 
              href="/map" 
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              Map View
            </Link>
            
            {user && (
              <Link 
                href="/create-event" 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Event
              </Link>
            )}
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
            <CategoryFilter 
              selectedCategories={selectedCategories} 
              onChange={setSelectedCategories} 
            />
            
            <DateFilter 
              selectedTimeFrame={selectedTimeFrame} 
              onChange={setSelectedTimeFrame} 
            />
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedTimeFrame('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
        
        {/* Events grid */}
        {loading && events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl">Loading events...</p>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            
            {/* Load more button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? 'Loading...' : 'Load More Events'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-medium mb-4">No Events Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't find any events matching your criteria.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedTimeFrame('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Clear Filters
              </button>
              
              {user && (
                <Link 
                  href="/create-event" 
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Create an Event
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
