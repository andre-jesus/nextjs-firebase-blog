import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import Head from 'next/head';
import Link from 'next/link';

export default function Profile() {
  const [user, authLoading] = useAuthState(auth);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    github: '',
    linkedin: '',
    instagram: ''
  });
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch user profile
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.name || '');
          setBio(userData.bio || '');
          setWebsite(userData.website || '');
          setEmail(userData.email || user.email || '');
          setJobTitle(userData.jobTitle || '');
          setLocation(userData.location || '');
          setSocialLinks({
            twitter: userData.socialLinks?.twitter || '',
            github: userData.socialLinks?.github || '',
            linkedin: userData.socialLinks?.linkedin || '',
            instagram: userData.socialLinks?.instagram || ''
          });
          setProfileImageUrl(userData.profileImageUrl || '');
          if (userData.profileImageUrl) {
            setProfileImagePreview(userData.profileImageUrl);
          }
        } else {
          // Create basic profile if it doesn't exist
          const newProfile = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            createdAt: new Date()
          };
          await setDoc(userDocRef, newProfile);
          setDisplayName(newProfile.name);
          setEmail(newProfile.email);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile data. Please try again.');
      }
    }

    fetchUserProfile();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 1MB for profile pics to avoid Firestore document size limits)
      if (file.size > 1 * 1024 * 1024) {
        setError('Image file is too large. Please select an image smaller than 1MB.');
        return;
      }
      
      setProfileImage(file);
      
      // Read as base64 and store directly
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfileImagePreview(base64String);
        setProfileImageUrl(base64String); // Store base64 string directly
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    
    try {
      if (!displayName.trim()) {
        setError('Display name is required');
        setSaving(false);
        return;
      }

      // No need to upload to Firebase Storage - using base64 directly
      console.log('Saving profile with base64 image...');

      // Update user profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        email: email.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        socialLinks,
        profileImageUrl: profileImageUrl, // This is now the base64 string
        updatedAt: new Date()
      });

      // Update display name in Firebase Auth if possible
      try {
        await user.updateProfile({
          displayName: displayName.trim()
        });
      } catch (authError) {
        console.error('Error updating auth profile:', authError);
        // Continue anyway as Firestore is our source of truth
      }

      setSuccess(true);
      setProfileImage(null);
      console.log('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Profile Settings | My Blog</title>
        <meta name="description" content="Update your profile and preferences" />
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <Link 
            href="/dashboard" 
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Back to Dashboard
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Profile updated successfully!
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Sidebar navigation */}
            <div className="md:w-64 bg-gray-50 dark:bg-gray-900 p-6">
              <div className="mb-8 text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mx-auto mb-3 flex items-center justify-center">
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-4xl text-gray-400 dark:text-gray-500">
                      {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{displayName || 'Your Name'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{jobTitle || 'Add your title'}</p>
              </div>
              
              <nav>
                <a href="#basic-info" className="block py-2 px-3 rounded text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium mb-1">
                  Basic Information
                </a>
                <a href="#profile-picture" className="block py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 mb-1">
                  Profile Picture
                </a>
                <a href="#social-profiles" className="block py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 mb-1">
                  Social Profiles
                </a>
              </nav>
            </div>
            
            {/* Main content */}
            <div className="flex-1 p-6">
              <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div id="basic-info" className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                    Basic Information
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="displayName">
                        Display Name*
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="jobTitle">
                        Job Title
                      </label>
                      <input
                        type="text"
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Software Developer, Writer, etc."
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="location">
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="website">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="bio">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows="4"
                      placeholder="Tell others about yourself"
                    ></textarea>
                    <p className="text-sm text-gray-500 mt-1">{bio.length}/500 characters</p>
                  </div>
                </div>
                
                {/* Profile Picture */}
                <div id="profile-picture" className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                    Profile Picture
                  </h2>
                  
                  <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4 md:mb-0">
                      {profileImagePreview ? (
                        <img 
                          src={profileImagePreview} 
                          alt="Profile preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-5xl text-gray-400 dark:text-gray-500">
                          {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Upload a profile picture. Max file size: 1MB
                      </p>
                      <p className="text-sm text-yellow-500 mt-1">
                        Images are stored as base64 data.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Social Profiles */}
                <div id="social-profiles" className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                    Social Profiles
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="twitter">
                        Twitter
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 rounded-l border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">@</span>
                        <input
                          type="text"
                          id="twitter"
                          value={socialLinks.twitter}
                          onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                          className="flex-1 p-2 border rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="github">
                        GitHub
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 rounded-l border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">@</span>
                        <input
                          type="text"
                          id="github"
                          value={socialLinks.github}
                          onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                          className="flex-1 p-2 border rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="linkedin">
                        LinkedIn
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 rounded-l border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">linkedin.com/in/</span>
                        <input
                          type="text"
                          id="linkedin"
                          value={socialLinks.linkedin}
                          onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                          className="flex-1 p-2 border rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="instagram">
                        Instagram
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 rounded-l border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">@</span>
                        <input
                          type="text"
                          id="instagram"
                          value={socialLinks.instagram}
                          onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                          className="flex-1 p-2 border rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Link
                    href="/dashboard"
                    className="px-5 py-2 mr-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}