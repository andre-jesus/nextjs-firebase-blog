import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { createEvent } from '../lib/models/eventModel';

export default function CreateEventPage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  
  // Form state
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    startDateTime: '',
    endDateTime: '',
    venueId: '',
    venueName: '',
    customLocation: false,
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      latitude: null,
      longitude: null
    },
    categories: [],
    price: {
      isFree: true,
      min: 0,
      max: 0,
      currency: 'USD'
    },
    ticketUrl: '',
    capacity: '',
    status: 'scheduled',
    visibility: 'public'
  });
  
  // UI state
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [additionalImages, setAdditionalImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // Multi-step form
  
  // Categories for selection
  const availableCategories = [
    'Music', 'Food', 'Art', 'Sports', 'Technology', 
    'Outdoors', 'Networking', 'Community', 'Education', 'Entertainment'
  ];
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/create-event');
    }
  }, [user, authLoading, router]);
  
  // Fetch user's venues
  useEffect(() => {
    if (!user) return;
    
    const fetchVenues = async () => {
      try {
        const venuesQuery = query(
          collection(db, 'venues'),
          where('ownerId', '==', user.uid),
          limit(10)
        );
        
        const snapshot = await getDocs(venuesQuery);
        const venuesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setVenues(venuesList);
      } catch (error) {
        console.error('Error fetching venues:', error);
      }
    };
    
    fetchVenues();
  }, [user]);
  
  // Handle cover image change
  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image smaller than 5MB.');
      return;
    }
    
    setCoverImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle venue selection
  const handleVenueChange = (e) => {
    const { value } = e.target;
    const selectedVenue = venues.find(venue => venue.id === value);
    
    setEventData(prev => {
      // If selecting 'custom', clear location data
      if (value === 'custom') {
        return {
          ...prev,
          venueId: '',
          venueName: '',
          customLocation: true,
          location: {
            address: '',
            city: '',
            state: '',
            country: '',
            latitude: null,
            longitude: null
          }
        };
      } 
      // If selecting a venue, use its location
      else if (selectedVenue) {
        return {
          ...prev,
          venueId: value,
          venueName: selectedVenue.name,
          customLocation: false,
          location: {
            address: selectedVenue.location?.address || '',
            city: selectedVenue.location?.city || '',
            state: selectedVenue.location?.state || '',
            country: selectedVenue.location?.country || '',
            latitude: selectedVenue.location?.geopoint?.latitude || null,
            longitude: selectedVenue.location?.geopoint?.longitude || null
          }
        };
      }
      // If clearing selection
      else {
        return {
          ...prev,
          venueId: '',
          venueName: '',
          customLocation: false,
          location: {
            address: '',
            city: '',
            state: '',
            country: '',
            latitude: null,
            longitude: null
          }
        };
      }
    });
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('location.')) {
      // Handle location fields
      const locationField = name.split('.')[1];
      setEventData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else if (name === 'price.isFree') {
      // Handle free price toggle
      setEventData(prev => ({
        ...prev,
        price: {
          ...prev.price,
          isFree: checked,
          min: checked ? 0 : prev.price.min,
          max: checked ? 0 : prev.price.max
        }
      }));
    } else if (name === 'price.min' || name === 'price.max') {
      // Handle price fields
      const priceField = name.split('.')[1];
      setEventData(prev => ({
        ...prev,
        price: {
          ...prev.price,
          [priceField]: type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else if (name === 'venueId') {
      // Use the dedicated venue change handler
      handleVenueChange(e);
    } else if (name === 'categories') {
      // Handle category selection (multi-select)
      const select = e.target;
      const selectedCategories = Array.from(select.selectedOptions, option => option.value);
      setEventData(prev => ({
        ...prev,
        categories: selectedCategories
      }));
    } else {
      // Handle all other fields
      setEventData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!eventData.name) throw new Error('Event name is required');
      if (!eventData.description) throw new Error('Event description is required');
      if (!eventData.startDateTime) throw new Error('Start date and time are required');
      
      // Format dates
      const formattedStartDateTime = new Date(eventData.startDateTime);
      const formattedEndDateTime = eventData.endDateTime ? new Date(eventData.endDateTime) : null;
      
      // Prepare event data
      const eventDataToSave = {
        ...eventData,
        creatorId: user.uid, // Make sure creator ID is set explicitly
        organizerId: user.uid, // Add organizer ID as well for permissions
        startDateTime: formattedStartDateTime,
        endDateTime: formattedEndDateTime
      };
      
      // Remove undefined fields and customLocation flag
      delete eventDataToSave.customLocation;
      
      // Upload cover image if provided
      if (coverImage) {
        setImageUploading(true);
        
        // Sanitize filename to avoid spaces and special characters
        const fileExtension = coverImage.name.split('.').pop().toLowerCase();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const sanitizedFileName = `${timestamp}_${randomString}.${fileExtension}`;
        
        const storageRef = ref(storage, `events/${user.uid}/${sanitizedFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, coverImage);
        
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setImageUploading(false);
            setError('Error uploading image: ' + error.message);
            setLoading(false);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Save event with cover image
              eventDataToSave.coverImage = downloadURL;
              const eventId = await createEvent(eventDataToSave, user.uid);
              
              setImageUploading(false);
              router.push(`/events/${eventId}`);
            } catch (error) {
              setImageUploading(false);
              setError('Error creating event: ' + error.message);
              setLoading(false);
            }
          }
        );
      } else {
        // Save event without cover image
        const eventId = await createEvent(eventDataToSave, user.uid);
        router.push(`/events/${eventId}`);
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };
  
  // Render loading state while checking authentication
  if (authLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }
  
  // Render form
  return (
    <div>
      <Head>
        <title>Create Event | Happen</title>
        <meta name="description" content="Create a new event on Happen" />
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create an Event</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          {/* Step indicator */}
          <div className="flex mb-8">
            <div 
              className={`flex-1 border-t-4 pt-4 ${step >= 1 ? 'border-blue-600' : 'border-gray-300'}`}
            >
              <p className={`font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>Basic Info</p>
            </div>
            <div 
              className={`flex-1 border-t-4 pt-4 ${step >= 2 ? 'border-blue-600' : 'border-gray-300'}`}
            >
              <p className={`font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>Location & Time</p>
            </div>
            <div 
              className={`flex-1 border-t-4 pt-4 ${step >= 3 ? 'border-blue-600' : 'border-gray-300'}`}
            >
              <p className={`font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>Details & Publish</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <label htmlFor="name" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Event Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={eventData.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="shortDescription" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Short Description (140 characters max)
                  </label>
                  <input
                    type="text"
                    id="shortDescription"
                    name="shortDescription"
                    value={eventData.shortDescription}
                    onChange={handleInputChange}
                    maxLength="140"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {eventData.shortDescription.length}/140 characters
                  </p>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="description" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Event Description*
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={eventData.description}
                    onChange={handleInputChange}
                    rows="6"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  ></textarea>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="coverImage" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Cover Image
                  </label>
                  <input
                    type="file"
                    id="coverImage"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recommended size: 1200x630 pixels. Max file size: 5MB.
                  </p>
                  
                  {coverImagePreview && (
                    <div className="mt-4">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="max-h-64 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
                
                <div className="mb-6">
                  <label htmlFor="categories" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Categories (select multiple)
                  </label>
                  <select
                    id="categories"
                    name="categories"
                    multiple
                    value={eventData.categories}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    size="5"
                  >
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Hold Ctrl (or Cmd on Mac) to select multiple categories
                  </p>
                </div>
                
                <div className="flex justify-end mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next: Location & Time
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 2: Location & Time */}
            {step === 2 && (
              <div>
                <div className="mb-6">
                  <label htmlFor="startDateTime" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Start Date and Time*
                  </label>
                  <input
                    type="datetime-local"
                    id="startDateTime"
                    name="startDateTime"
                    value={eventData.startDateTime}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="endDateTime" className="block text-gray-700 dark:text-gray-300 mb-2">
                    End Date and Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="endDateTime"
                    name="endDateTime"
                    value={eventData.endDateTime}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="venueId" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Venue
                  </label>
                  <select
                    id="venueId"
                    name="venueId"
                    value={eventData.venueId}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select a venue</option>
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                    <option value="custom">Custom location</option>
                  </select>
                </div>
                
                {/* Custom location fields */}
                {eventData.customLocation && (
                  <div className="border p-4 rounded-lg mb-6">
                    <h3 className="font-medium mb-4">Custom Location</h3>
                    
                    <div className="mb-4">
                      <label htmlFor="location.address" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Street Address*
                      </label>
                      <input
                        type="text"
                        id="location.address"
                        name="location.address"
                        value={eventData.location.address}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        required={eventData.customLocation}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label htmlFor="location.city" className="block text-gray-700 dark:text-gray-300 mb-2">
                          City*
                        </label>
                        <input
                          type="text"
                          id="location.city"
                          name="location.city"
                          value={eventData.location.city}
                          onChange={handleInputChange}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          required={eventData.customLocation}
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="location.state" className="block text-gray-700 dark:text-gray-300 mb-2">
                          State/Province*
                        </label>
                        <input
                          type="text"
                          id="location.state"
                          name="location.state"
                          value={eventData.location.state}
                          onChange={handleInputChange}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          required={eventData.customLocation}
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="location.country" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Country*
                      </label>
                      <input
                        type="text"
                        id="location.country"
                        name="location.country"
                        value={eventData.location.country}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        required={eventData.customLocation}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Back
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next: Details & Publish
                  </button>
                </div>
              </div>
            )}
            
            {/* Step 3: Details & Publish */}
            {step === 3 && (
              <div>
                <div className="mb-6">
                  <label className="flex items-center text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="price.isFree"
                      checked={eventData.price.isFree}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    This is a free event
                  </label>
                </div>
                
                {!eventData.price.isFree && (
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price.min" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Price ($)
                      </label>
                      <input
                        type="number"
                        id="price.min"
                        name="price.min"
                        value={eventData.price.min}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="price.max" className="block text-gray-700 dark:text-gray-300 mb-2">
                        Maximum Price ($)
                      </label>
                      <input
                        type="number"
                        id="price.max"
                        name="price.max"
                        value={eventData.price.max}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="ticketUrl" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Ticket URL (optional)
                  </label>
                  <input
                    type="url"
                    id="ticketUrl"
                    name="ticketUrl"
                    value={eventData.ticketUrl}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="https://..."
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="capacity" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Capacity (optional)
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    value={eventData.capacity}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="visibility" className="block text-gray-700 dark:text-gray-300 mb-2">
                    Event Visibility
                  </label>
                  <select
                    id="visibility"
                    name="visibility"
                    value={eventData.visibility}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="public">Public - Anyone can find this event</option>
                    <option value="unlisted">Unlisted - Only people with the link can find this event</option>
                    <option value="private">Private - Only people you invite can find this event</option>
                  </select>
                </div>
                
                {imageUploading && (
                  <div className="mb-6">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                      Uploading Image: {Math.round(uploadProgress)}%
                    </label>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading || imageUploading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {loading ? 'Creating Event...' : 'Create Event'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* Tips sidebar - could be expanded */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Tips for Great Events</h3>
          <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
            <li>Be clear and specific about what attendees can expect</li>
            <li>Add an eye-catching cover image</li>
            <li>Choose relevant categories to help people find your event</li>
            <li>Provide detailed location information</li>
            <li>Include ticket/registration information if applicable</li>
          </ul>
        </div>
      </div>
    </div>
  );
}