import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../lib/firebase';
import { getUserLocation } from '../lib/mapService';
import { useAuthRedirect } from '../lib/hooks/useAuthRedirect';

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

// Placeholder component for VenueCard until we create the real one
const VenueCard = ({ venue }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {venue.coverImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={venue.coverImage}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          <Link href={`/venues/${venue.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {venue.name}
          </Link>
        </h2>
        <div className="text-gray-600 dark:text-gray-400 mb-3">
          {venue.location && venue.location.address}
        </div>
        {venue.shortDescription && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{venue.shortDescription}</p>
        )}
        {venue.categories && venue.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {venue.categories.map(category => (
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
  );
};

export default function Home() {
  const [user] = useAuthState(auth);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Get events happening in the next 7 days
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const eventsQuery = query(
          collection(db, 'events'),
          where('startDateTime', '>=', Timestamp.fromDate(new Date())),
          where('startDateTime', '<=', Timestamp.fromDate(nextWeek)),
          where('status', '==', 'scheduled'),
          orderBy('startDateTime', 'asc'),
          limit(6)
        );

        const snapshot = await getDocs(eventsQuery);
        const eventList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUpcomingEvents(eventList);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
      }
    };

    fetchEvents();
  }, []);

  // Fetch featured venues
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesQuery = query(
          collection(db, 'venues'),
          where('featured', '==', true),
          where('status', '==', 'active'),
          limit(3)
        );

        const snapshot = await getDocs(venuesQuery);
        const venueList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFeaturedVenues(venueList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching featured venues:', error);
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  // Fetch nearby events if we have user location
  useEffect(() => {
    if (!userLocation) return;
    
    const fetchNearbyEvents = async () => {
      try {
        // This is a simple placeholder that just gets events
        // In a real implementation, we would filter by geolocation
        const eventsQuery = query(
          collection(db, 'events'),
          where('startDateTime', '>=', Timestamp.fromDate(new Date())),
          orderBy('startDateTime', 'asc'),
          limit(3)
        );

        const snapshot = await getDocs(eventsQuery);
        const eventList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setNearbyEvents(eventList);
      } catch (error) {
        console.error('Error fetching nearby events:', error);
      }
    };

    fetchNearbyEvents();
  }, [userLocation]);

  return (
    <div>
      <Head>
        <title>Happen | Discover Events Near You</title>
        <meta name="description" content="Discover exciting events happening around you with Happen" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Updated Hero Section with two CTAs */}
        <section className="relative bg-blue-600 text-white rounded-xl overflow-hidden mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-800 opacity-90"></div>
          <div className="relative z-10 py-16 px-8 md:px-16 flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Discover What's Happening</h1>
            <p className="text-xl mb-8 max-w-2xl text-center">
              Find and join exciting events happening around you. Connect with friends and explore new experiences.
            </p>
            
            {/* Dual audience user flows */}
            <div className="grid w-full md:grid-cols-2 gap-8 mt-4">
              {/* Event-goer focused CTA */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-white flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <h2 className="text-2xl font-bold mb-4">Discover Events Near You</h2>
                <p className="mb-6">Find exciting events happening around you and connect with friends.</p>
                <Link 
                  href="/login?type=user" 
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors w-full text-center"
                >
                  Browse Events
                </Link>
              </div>
              
              {/* Venue manager focused CTA */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-white flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <h2 className="text-2xl font-bold mb-4">Promote Your Venue & Events</h2>
                <p className="mb-6">List your venue, create events, and grow your audience.</p>
                <Link 
                  href="/login?type=venue" 
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors w-full text-center"
                >
                  Manage Venue
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <Link href="/events" className="text-blue-600 hover:underline flex items-center">
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {loading ? (
            <p className="text-center py-12">Loading events...</p>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">No upcoming events found</p>
              <Link href="/create-event" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Create an Event
              </Link>
            </div>
          )}
        </section>

        {/* Featured Venues */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Featured Venues</h2>
            <Link href="/venues" className="text-blue-600 hover:underline flex items-center">
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {loading ? (
            <p className="text-center py-12">Loading venues...</p>
          ) : featuredVenues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVenues.map(venue => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300">No featured venues found</p>
            </div>
          )}
        </section>

        {/* Nearby Events (only show if we have location) */}
        {userLocation && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Events Near You</h2>
              <Link href="/map" className="text-blue-600 hover:underline flex items-center">
                View Map
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
            {nearbyEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nearbyEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-300">No events found near you</p>
              </div>
            )}
          </section>
        )}

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Create Your Own Event?</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Share your passion, connect with others, and create unforgettable experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login?type=venue" 
              className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-block"
            >
              {user ? "Create an Event" : "Sign Up as Venue Manager"}
            </Link>
            <Link 
              href="/login?type=user" 
              className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors inline-block"
            >
              {user ? "Browse Events" : "Sign Up as Event-goer"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}