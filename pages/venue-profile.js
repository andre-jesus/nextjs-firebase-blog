import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { getUserProfile } from '../lib/models/userModel';
import { createVenue, updateVenue } from '../lib/models/venueModel';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Head from 'next/head';

export default function VenueProfile() {
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [venueData, setVenueData] = useState({
    name: '',
    description: '',
    categories: [],
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    location: {
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      geopoint: null
    },
    hoursOfOperation: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    },
    images: [],
    amenities: [],
    settings: {
      publicBooking: true,
      requireApproval: false,
      autoConfirm: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Category options for the venue
  const categoryOptions = [
    "Restaurant", "Bar", "Club", "Live Music", "Art Gallery", 
    "Theater", "Museum", "Community Center", "Outdoor Space",
    "Coffee Shop", "Co-working Space", "Workshop", "Retail", "Other"
  ];
  
  // Amenity options for the venue
  const amenityOptions = [
    "Wheelchair Accessible", "Parking", "WiFi", "Restrooms", 
    "Food Available", "Alcohol Served", "Family Friendly", 
    "Outdoor Seating", "Air Conditioning", "Private Rooms"
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userProfile = await getUserProfile(user.uid);
        
        // If not a venue account, redirect to regular user dashboard
        if (!userProfile?.isVenueAccount) {
          router.push('/dashboard');
          return;
        }
        
        setUserData(userProfile);
        
        // Check if venue data already exists
        if (userProfile.venueId) {
          const venueRef = doc(db, 'venues', userProfile.venueId);
          const venueSnap = await getDoc(venueRef);
          
          if (venueSnap.exists()) {
            setVenueData(venueSnap.data());
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load venue profile. Please try again.');
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      if (!user) {
        router.push('/login?type=venue');
      } else {
        fetchUserData();
      }
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setVenueData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setVenueData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setVenueData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: checked
        }
      }));
    } else {
      setVenueData(prev => ({
        ...prev,
        [name]: checked
      }));
    }
  };
  
  const handleCategoryChange = (category) => {
    setVenueData(prev => {
      const updated = { ...prev };
      
      if (updated.categories.includes(category)) {
        updated.categories = updated.categories.filter(c => c !== category);
      } else {
        updated.categories = [...updated.categories, category];
      }
      
      return updated;
    });
  };
  
  const handleAmenityChange = (amenity) => {
    setVenueData(prev => {
      const updated = { ...prev };
      
      if (updated.amenities.includes(amenity)) {
        updated.amenities = updated.amenities.filter(a => a !== amenity);
      } else {
        updated.amenities = [...updated.amenities, amenity];
      }
      
      return updated;
    });
  };
  
  const handleHoursChange = (day, field, value) => {
    setVenueData(prev => ({
      ...prev,
      hoursOfOperation: {
        ...prev.hoursOfOperation,
        [day]: {
          ...prev.hoursOfOperation[day],
          [field]: field === 'closed' ? !prev.hoursOfOperation[day].closed : value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      let venueId = userData.venueId;
      console.log('Submitting venue profile...', { venueId, userId: user?.uid });
      
      if (venueId) {
        // Update existing venue
        console.log('Updating existing venue:', venueId);
        try {
          // Set ownerId to current user to ensure ownership is clear
          const venueDataToUpdate = {
            ...venueData,
            ownerId: user.uid,
            userId: user.uid // Add this to ensure the update model has user context
          };
          
          await updateVenue(venueId, venueDataToUpdate);
          console.log('Venue update successful');
        } catch (updateError) {
          console.error('Update error:', updateError);
          
          // Provide specific error information based on error type
          if (updateError.code === 'permission-denied') {
            setError(`Permission denied: You don't have permission to update this venue. Only the venue owner can make changes. Error: ${updateError.message}`);
          } else {
            setError(`Failed to update venue profile: ${updateError.message} (Error code: ${updateError.code || 'unknown'})`);
          }
          setSaving(false);
          return; // Exit early on error
        }
      } else {
        // Create new venue
        console.log('Creating new venue for user:', user.uid);
        try {
          venueId = await createVenue({
            ...venueData,
            ownerId: user.uid  // Explicitly set owner ID
          }, user.uid);
          
          console.log('New venue created with ID:', venueId);
        } catch (createError) {
          console.error('Venue creation error:', createError);
          setError(`Failed to create venue: ${createError.message} (Error code: ${createError.code || 'unknown'})`);
          setSaving(false);
          return; // Exit early on error
        }
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error in venue profile submission:', error);
      setError(`An unexpected error occurred: ${error.message}. Please try again.`);
    }
    
    setSaving(false);
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Venue Profile | Happen</title>
      </Head>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Venue Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Update your venue information and settings
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {showSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            Venue profile saved successfully!
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Venue Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={venueData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={venueData.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Describe your venue, its atmosphere, and what makes it special.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryChange(category)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        venueData.categories.includes(category)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select all categories that apply to your venue.
                </p>
              </div>
            </div>
          </section>
          
          {/* Contact Information */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="contact.phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="contact.phone"
                  name="contact.phone"
                  value={venueData.contact.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="contact.email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="contact.email"
                  name="contact.email"
                  value={venueData.contact.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="contact.website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="contact.website"
                  name="contact.website"
                  value={venueData.contact.website}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </section>
          
          {/* Location */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Location</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="location.address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address*
                </label>
                <input
                  type="text"
                  id="location.address"
                  name="location.address"
                  value={venueData.location.address}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City*
                  </label>
                  <input
                    type="text"
                    id="location.city"
                    name="location.city"
                    value={venueData.location.city}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="location.state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State/Province*
                  </label>
                  <input
                    type="text"
                    id="location.state"
                    name="location.state"
                    value={venueData.location.state}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location.postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Postal Code*
                  </label>
                  <input
                    type="text"
                    id="location.postalCode"
                    name="location.postalCode"
                    value={venueData.location.postalCode}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label htmlFor="location.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country*
                  </label>
                  <input
                    type="text"
                    id="location.country"
                    name="location.country"
                    value={venueData.location.country}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </section>
          
          {/* Operating Hours */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Business Hours</h2>
            
            <div className="space-y-4">
              {Object.entries(venueData.hoursOfOperation).map(([day, hours]) => (
                <div key={day} className="grid grid-cols-4 md:grid-cols-6 gap-2 items-center">
                  <div className="col-span-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                  </div>
                  
                  <div className="col-span-3 md:col-span-2 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${day}-closed`}
                      checked={hours.closed}
                      onChange={() => handleHoursChange(day, 'closed')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`${day}-closed`} className="text-sm text-gray-700 dark:text-gray-300">
                      Closed
                    </label>
                  </div>
                  
                  <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        disabled={hours.closed}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        disabled={hours.closed}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Amenities */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Amenities</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {amenityOptions.map(amenity => (
                <div key={amenity} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`amenity-${amenity}`}
                    checked={venueData.amenities.includes(amenity)}
                    onChange={() => handleAmenityChange(amenity)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`amenity-${amenity}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </section>
          
          {/* Booking Settings */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Booking Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="settings.publicBooking"
                  name="settings.publicBooking"
                  checked={venueData.settings.publicBooking}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="settings.publicBooking" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Allow public event bookings
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="settings.requireApproval"
                  name="settings.requireApproval"
                  checked={venueData.settings.requireApproval}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="settings.requireApproval" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Require approval for bookings
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="settings.autoConfirm"
                  name="settings.autoConfirm"
                  checked={venueData.settings.autoConfirm}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="settings.autoConfirm" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Auto-confirm bookings
                </label>
              </div>
            </div>
          </section>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Venue Profile'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
