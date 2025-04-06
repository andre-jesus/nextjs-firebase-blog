import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Head from 'next/head';
import Link from 'next/link';

export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch user's posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user) return;

      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', user.uid)
        );
        
        const snapshot = await getDocs(postsQuery);
        const postList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPosts(postList);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        setPosts(posts.filter(post => post.id !== postId));
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  if (loading || !user) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Dashboard | My Blog</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link 
            href="/create-post"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create New Post
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Posts</h2>
          
          {loadingPosts ? (
            <p>Loading your posts...</p>
          ) : posts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id} className="border-b">
                      <td className="px-4 py-2">
                        <Link href={`/posts/${post.id}`} className="hover:text-blue-600">
                          {post.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {post.createdAt && new Date(post.createdAt.toDate()).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/edit-post/${post.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>You haven't created any posts yet.</p>
          )}
        </div>
      </div>
    </>
  );
}