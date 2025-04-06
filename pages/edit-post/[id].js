import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Head from 'next/head';

export default function EditPost() {
  const [user, loading] = useAuthState(auth);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const router = useRouter();
  const { id } = router.query;

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!id || !user) return;

      try {
        const postDoc = await getDoc(doc(db, 'posts', id));
        
        if (postDoc.exists()) {
          const postData = postDoc.data();
          
          // Check if user is the author
          if (postData.authorId !== user.uid) {
            setError("You don't have permission to edit this post");
            return;
          }
          
          setPost({ id: postDoc.id, ...postData });
          setTitle(postData.title);
          setContent(postData.content);
          setExcerpt(postData.excerpt || '');
          setCurrentImage(postData.featuredImage || '');
        } else {
          setError('Post not found');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
  }, [id, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!image) return currentImage;

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
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUploading(false);
          resolve(downloadURL);
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

      // Upload image if a new one is selected
      let imageUrl = currentImage;
      if (image) {
        imageUrl = await uploadImage();
      }

      // Update post in Firestore
      const postRef = doc(db, 'posts', id);
      await updateDoc(postRef, {
        title,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        featuredImage: imageUrl,
        updatedAt: serverTimestamp()
      });

      router.push(`/posts/${id}`);
    } catch (error) {
      setError(error.message);
      setSaving(false);
    }
  };

  if (loading || loadingPost) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Post | My Blog</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Post</h1>
        
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
            
            {currentImage && !imagePreview && (
              <div className="mt-2 mb-4">
                <p className="text-sm text-gray-600 mb-2">Current image:</p>
                <img
                  src={currentImage}
                  alt="Current featured image"
                  className="h-40 w-auto object-cover rounded"
                />
              </div>
            )}
            
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {imagePreview && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">New image:</p>
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
              {saving ? 'Saving...' : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}