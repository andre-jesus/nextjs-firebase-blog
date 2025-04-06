import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { getEvent } from '../../lib/models/eventModel';

// Format date and time
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = typeof timestamp.toDate === 'function' 
    ? timestamp.toDate() 
    : new Date(timestamp);
    
  return format(date, 'EEEE, MMMM d, yyyy');
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = typeof timestamp.toDate === 'function' 
    ? timestamp.toDate() 
    : new Date(timestamp);
    
  return format(date, 'h:mm a');
};

// Placeholder component for CheckInButton until we create the real one
const CheckInButton = ({ eventId }) => {
  return (
    <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Check In
    </button>
  );
};

// Placeholder component for SaveButton (MoodBoard) until we create the real one
const SaveButton = ({ eventId }) => {
  const [saved, setSaved] = useState(false);
  
  const toggleSaved = () => {
    setSaved(!saved);
  };
  
  return (
    <button 
      className={`flex items-center px-4 py-2 rounded ${
        saved 
          ? 'bg-gray-200 text-gray-800' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      onClick={toggleSaved}
    >
      <svg 
        className={`w-5 h-5 mr-2 ${saved ? 'text-yellow-500' : ''}`} 
        fill={saved ? "currentColor" : "none"} 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        ></path>
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
};

// Placeholder component for simple venue preview
const VenuePreview = ({ venue }) => {
  if (!venue) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
      <h3 className="font-medium text-lg mb-2">{venue.name}</h3>
      {venue.location && venue.location.address && (
        <div className="flex items-start mb-2">
          <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span className="text-gray-700 dark:text-gray-300">
            {venue.location.address}
            {venue.location.city && `, ${venue.location.city}`}
            {venue.location.state && `, ${venue.location.state}`}
          </span>
        </div>
      )}
      <Link href={`/venues/${venue.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center">
        View Venue Details
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </Link>
    </div>
  );
};

// Simple placeholder map component (will be replaced with actual map later)
const LocationMap = ({ location }) => {
  if (!location || !location.geopoint) return null;
  
  return (
    <div className="bg-gray-200 dark:bg-gray-700 h-60 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-2">Map View Coming Soon</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Location: {location.latitude || location.geopoint.latitude}, {location.longitude || location.geopoint.longitude}
        </p>
      </div>
    </div>
  );
};

export default function EventDetail() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { id } = router.query;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch event data
  useEffect(() => {
    if (!id) return;
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(id);
        
        if (!eventData) {
          setError('Event not found');
        } else {
          setEvent(eventData);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id]);
  
  // Render loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-xl">Loading event details...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
          <Link 
            href="/events" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Browse Other Events
          </Link>
        </div>
      </div>
    );
  }
  
  // Render empty state if no event found
  if (!event) return null;
  
  return (
    <div>
      <Head>
        <title>{event.name} | Happen</title>
        <meta name="description" content={event.shortDescription || event.description?.substring(0, 160)} />
        {event.coverImage && <meta property="og:image" content={event.coverImage} />}
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Event header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.name}</h1>
              
              <div className="flex items-center text-blue-600 dark:text-blue-400 mb-3">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="font-medium">
                  {formatDate(event.startDateTime)} • {formatTime(event.startDateTime)}
                  {event.endDateTime && ` - ${formatTime(event.endDateTime)}`}
                </span>
              </div>
              
              <div className="flex items-start mb-4">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span className="text-gray-700 dark:text-gray-300">
                  {event.venueName || 
                    (event.location && [
                      event.location.address,
                      event.location.city,
                      event.location.state
                    ].filter(Boolean).join(', '))}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <SaveButton eventId={event.id} />
              {event.startDateTime && new Date(event.startDateTime.toDate()) >= new Date() && (
                <CheckInButton eventId={event.id} />
              )}
            </div>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.categories && event.categories.map(category => (
              <Link 
                key={category} 
                href={`/events?categories=${encodeURIComponent(category)}`}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Event cover image */}
        {event.coverImage && (
          <div className="mb-8">
            <img 
              src={event.coverImage} 
              alt={event.name} 
              className="w-full h-auto rounded-lg object-cover max-h-96"
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Event description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">About This Event</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-line">{event.description}</p>
              </div>
            </div>
            
            {/* Organizer info */}
            {event.organizer && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Organized by</h2>
                <div className="flex items-center">
                  {event.organizer.photoURL ? (
                    <img 
                      src={event.organizer.photoURL} 
                      alt={event.organizer.name} 
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                      <span className="text-blue-700 dark:text-blue-300 font-medium text-lg">
                        {event.organizer.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{event.organizer.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Organizer</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Attending section - placeholder for now */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Who's Attending</h2>
              {event.attendeeCount > 0 ? (
                <p className="text-gray-700 dark:text-gray-300">
                  {event.attendeeCount} {event.attendeeCount === 1 ? 'person' : 'people'} attending
                </p>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  Be the first to check in to this event!
                </p>
              )}
            </div>
          </div>
          
          <div>
            {/* Event details sidebar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Event Details</h3>
              
              {/* Date and time */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date and Time</h4>
                <p className="text-gray-800 dark:text-gray-200">
                  {formatDate(event.startDateTime)}<br />
                  {formatTime(event.startDateTime)} 
                  {event.endDateTime && ` - ${formatTime(event.endDateTime)}`}
                </p>
              </div>
              
              {/* Price */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Price</h4>
                <p className="text-gray-800 dark:text-gray-200">
                  {event.price?.isFree ? 'Free' : (
                    event.price ? (
                      `$${event.price.min}${event.price.max > event.price.min ? ` - $${event.price.max}` : ''}`
                    ) : 'Free'
                  )}
                </p>
              </div>
              
              {/* Ticket URL */}
              {event.ticketUrl && (
                <div className="mb-4">
                  <a 
                    href={event.ticketUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700"
                  >
                    Get Tickets
                  </a>
                </div>
              )}
              
              {/* Location map */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location</h4>
                <LocationMap location={event.location} />
              </div>
            </div>
            
            {/* Venue preview */}
            {event.venue && (
              <VenuePreview venue={event.venue} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
