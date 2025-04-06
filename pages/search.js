import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PostCard from '../components/PostCard';
import SEO from '../components/SEO';

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Update search term when URL query changes
  useEffect(() => {
    if (q) {
      setSearchTerm(q);
      performSearch(q);
    }
  }, [q]);

  const performSearch = async (term) => {
    if (!term) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      // In a production app, you'd want to use Firebase extensions like Algolia
      // or a server-side search solution. This is a very basic implementation.
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(postsQuery);
      
      // Client-side filtering (not optimal for large datasets)
      const termLower = term.toLowerCase();
      const filteredPosts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(post => 
          post.title.toLowerCase().includes(termLower) || 
          post.content.toLowerCase().includes(termLower) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(termLower))
        );
      
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error searching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    // Update URL with search query
    router.push({
      pathname: '/search',
      query: { q: searchTerm.trim() }
    });
  };

  return (
    <>
      <SEO 
        title="Search"
        description="Search for blog posts"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Search</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for posts..."
              className="flex-grow p-3 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-r hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>
        
        {loading ? (
          <p>Searching...</p>
        ) : searched ? (
          <>
            <h2 className="text-xl font-semibold mb-4">
              {posts.length} {posts.length === 1 ? 'result' : 'results'} for "{q}"
            </h2>
            
            {posts.length > 0 ? (
              <div className="grid gap-6">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <p>No posts found matching your search.</p>
            )}
          </>
        ) : (
          <p>Enter a search term to find posts.</p>
        )}
      </div>
    </>
  );
}