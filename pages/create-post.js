import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Head from 'next/head';

export default function CreatePost() {
  const [user, loading] = useAuthState(auth);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [error, setError] = useState(null);
  const [detailedError, setDetailedError] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Create user profile if it doesn't exist
  useEffect(() => {
    const createUserProfileIfNeeded = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Create basic user profile
          const userData = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            createdAt: serverTimestamp(),
            role: 'author'
          };
          
          await setDoc(userDocRef, userData);
          console.log('Created user profile:', userData);
        }
      } catch (error) {
        console.error('Error checking/creating user profile:', error);
      }
    };

    createUserProfileIfNeeded();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Please select an image smaller than 5MB.');
        return;
      }
      
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    setImageUploading(true);
    const storageRef = ref(storage, `blog/${user.uid}/${Date.now()}-${image.name}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setImageProgress(progress);
        },
        (error) => {
          setImageUploading(false);
          console.error('Image upload error:', error);
          setDetailedError(JSON.stringify(error));
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setImageUploading(false);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setDetailedError(JSON.stringify(error));
            setImageUploading(false);
            reject(error);
          }
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !content) {
      setError('Title and content are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setDetailedError(null);

      // Upload image if selected
      let imageUrl = null;
      if (image) {
        try {
          imageUrl = await uploadImage();
        } catch (uploadError) {
          setError('Error uploading image. Your post will be saved without an image.');
          console.error('Image upload failed:', uploadError);
        }
      }

      // Create default author information
      let authorInfo = {
        name: user.displayName || user.email.split('@')[0] || 'Anonymous',
        uid: user.uid
      };

      // Try to get user data from Firestore, but use default if it fails
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Only use the userData if it's valid
          if (userData && userData.name) {
            authorInfo = {
              name: userData.name,
              uid: user.uid
            };
          }
        } else {
          // Create the user profile since it doesn't exist
          await setDoc(userDocRef, {
            name: authorInfo.name,
            email: user.email,
            createdAt: serverTimestamp(),
            role: 'author'
          });
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        // Continue with default author info
      }

      // Create post in Firestore
      const postData = {
        title,
        content,
        excerpt: excerpt || (content.length > 150 ? content.substring(0, 150) + '...' : content),
        featuredImage: imageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        published: true,
        authorId: user.uid,
        author: authorInfo,
        categories: []  // Default empty categories array
      };

      console.log('Saving post data:', JSON.stringify({
        ...postData,
        createdAt: 'serverTimestamp()',
        updatedAt: 'serverTimestamp()'
      }));
      
      const postsCollectionRef = collection(db, 'posts');
      const docRef = await addDoc(postsCollectionRef, postData);
      console.log('Post saved successfully with ID:', docRef.id);
      
      router.push(`/posts/${docRef.id}`);
    } catch (error) {
      console.error('Error saving post:', error);
      setError(`Failed to save post: ${error.message}`);
      setDetailedError(JSON.stringify(error));
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Create Post | My Blog</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create New Post</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {detailedError && (
          <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4 overflow-auto text-xs">
            <strong>Detailed Error:</strong>
            <pre>{detailedError}</pre>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="title">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="excerpt">
              Excerpt (optional)
            </label>
            <input
              type="text"
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief summary of your post"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="image">
              Featured Image (optional)
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-40 w-auto object-cover rounded"
                />
              </div>
            )}
            
            {imageUploading && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${imageProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Uploading: {Math.round(imageProgress)}%
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="content">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="12"
              required
              placeholder="Write your content in Markdown format"
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="mr-2 px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              disabled={saving || imageUploading}
            >
              {saving ? 'Saving...' : 'Publish Post'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
          <p className="font-medium">Note:</p>
          <ul className="list-disc pl-5">
            <li>Make sure you've completed the Firebase setup in the Firebase Console.</li>
            <li>You'll need to deploy Storage and Firestore rules for uploads to work.</li>
            <li>If using images, images must be smaller than 5MB.</li>
          </ul>
        </div>
      </div>
    </>
  );
}