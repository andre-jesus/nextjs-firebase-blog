import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import PostCard from '../../components/PostCard';

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!slug) return;

    async function fetchPosts() {
      setLoading(true);
      
      // Format the category name for display (capitalize first letter)
      const formattedName = slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      setCategoryName(formattedName);
      
      try {
        // In a real app, you'd have a more sophisticated way to filter by category
        const postsQuery = query(
          collection(db, 'posts'),
          where('categories', 'array-contains', formattedName)
        );
        
        const snapshot = await getDocs(postsQuery);
        const postList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPosts(postList);
      } catch (error) {
        console.error('Error fetching category posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [slug]);

  // For demo purposes, let's add some placeholder posts if none found
  useEffect(() => {
    if (!loading && posts.length === 0 && categoryName) {
      // Create some placeholder posts for the category
      const placeholderPosts = Array(3).fill().map((_, i) => ({
        id: `placeholder-${i}`,
        title: `Sample ${categoryName} Post ${i + 1}`,
        excerpt: `This is a sample post for the ${categoryName} category. In a real application, this would be an actual blog post.`,
        createdAt: { toDate: () => new Date(Date.now() - i * 86400000) },
        author: { name: 'Demo Author' }
      }));
      
      setPosts(placeholderPosts);
    }
  }, [loading, posts, categoryName]);

  return (
    <>
      <Head>
        <title>{categoryName || 'Category'} | My Blog</title>
        <meta name="description" content={`Browse posts in the ${categoryName} category`} />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">
          {categoryName ? `${categoryName} Posts` : 'Category'}
        </h1>
        
        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length > 0 ? (
          <div className="grid gap-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p>No posts found in this category.</p>
        )}
      </div>
    </>
  );
}