import Head from 'next/head';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Link from 'next/link';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        // This is a simple implementation that scans posts and extracts categories
        // In a real app, you might have a separate 'categories' collection
        const postsQuery = query(collection(db, 'posts'));
        const snapshot = await getDocs(postsQuery);
        
        // Extract categories from posts and count them
        const categoryMap = {};
        
        snapshot.docs.forEach(doc => {
          const post = doc.data();
          const postCategories = post.categories || [];
          
          postCategories.forEach(category => {
            if (categoryMap[category]) {
              categoryMap[category].count += 1;
            } else {
              categoryMap[category] = {
                name: category,
                count: 1
              };
            }
          });
        });
        
        // Convert to array and sort by count
        const categoryArray = Object.values(categoryMap).sort((a, b) => b.count - a.count);
        setCategories(categoryArray);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Define some placeholder categories if none are found in the database
  useEffect(() => {
    if (!loading && categories.length === 0) {
      setCategories([
        { name: 'Technology', count: 5 },
        { name: 'Lifestyle', count: 3 },
        { name: 'Travel', count: 2 },
        { name: 'Food', count: 2 },
        { name: 'Health', count: 1 }
      ]);
    }
  }, [loading, categories]);

  return (
    <>
      <Head>
        <title>Categories | My Blog</title>
        <meta name="description" content="Browse blog posts by category" />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Categories</h1>
        
        {loading ? (
          <p>Loading categories...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Link 
                key={category.name}
                href={`/category/${encodeURIComponent(category.name.toLowerCase())}`}
                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{category.name}</h2>
                <p className="text-gray-600">
                  {category.count} {category.count === 1 ? 'post' : 'posts'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}