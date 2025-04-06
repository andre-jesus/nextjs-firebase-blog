import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function PostCard({ post }) {
  const [authorData, setAuthorData] = useState(null);
  
  // Fetch author data if we have an authorId but no profile image
  useEffect(() => {
    const fetchAuthorData = async () => {
      if (!post.authorId || (post.author && post.author.profileImageUrl)) {
        return;
      }
      
      try {
        const authorDoc = await getDoc(doc(db, 'users', post.authorId));
        if (authorDoc.exists()) {
          setAuthorData(authorDoc.data());
        }
      } catch (error) {
        console.error('Error fetching author data:', error);
      }
    };
    
    fetchAuthorData();
  }, [post.authorId, post.author]);
  
  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Get formatted date
  const formattedDate = post.createdAt 
    ? format(post.createdAt.toDate(), 'MMMM dd, yyyy')
    : '';
  
  // Get author name with fallbacks
  const authorName = post.author?.name || 
    (authorData && authorData.name) || 
    'Anonymous';
  
  // Get author profile image with fallbacks
  const profileImageUrl = post.author?.profileImageUrl || 
    (authorData && authorData.profileImageUrl) || 
    null;

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {post.featuredImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          <Link href={`/posts/${post.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {post.title}
          </Link>
        </h2>
        
        <div className="flex items-center mb-3">
          <div className="mr-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 overflow-hidden">
              {profileImageUrl ? (
                <img 
                  src={profileImageUrl} 
                  alt={authorName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(authorName)
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {authorName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate}
            </div>
          </div>
        </div>
        
        {post.excerpt && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">{post.excerpt}</p>
        )}
        
        <Link 
          href={`/posts/${post.id}`}
          className="inline-flex items-center font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          Read more
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            ></path>
          </svg>
        </Link>
        
        {post.categories && post.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.categories.map(category => (
              <Link 
                key={category} 
                href={`/category/${category.toLowerCase()}`}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {category}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}