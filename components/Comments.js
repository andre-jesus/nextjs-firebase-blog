import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';

export default function Comments({ postId }) {
  const [user] = useAuthState(auth);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});

  // Fetch comments for this post
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const commentsQuery = query(
          collection(db, 'comments'),
          where('postId', '==', postId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(commentsQuery);
        const commentList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setComments(commentList);

        // Fetch user profiles for all comment authors
        const authorIds = [...new Set(commentList.map(comment => comment.authorId))];
        const authorProfiles = {};
        
        await Promise.all(authorIds.map(async (authorId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', authorId));
            if (userDoc.exists()) {
              authorProfiles[authorId] = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching user ${authorId}:`, error);
          }
        }));
        
        setUserProfiles(authorProfiles);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;
    
    setSubmitting(true);
    
    try {
      // Get user profile data first
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let userName = user.displayName || 'Anonymous';
      let userProfileImage = null;
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userName = userData.name || userName;
        userProfileImage = userData.profileImageUrl || null;
      }

      // Add new comment to Firestore
      const commentData = {
        postId,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorName: userName,
        authorEmail: user.email,
        authorProfileImage: userProfileImage
      };
      
      const docRef = await addDoc(collection(db, 'comments'), commentData);
      
      // Add new comment to state
      const newCommentWithDate = {
        id: docRef.id,
        ...commentData,
        createdAt: {
          toDate: () => new Date()
        }
      };
      
      setComments([newCommentWithDate, ...comments]);
      
      // Update user profiles cache
      if (!userProfiles[user.uid]) {
        setUserProfiles({
          ...userProfiles,
          [user.uid]: {
            name: userName,
            profileImageUrl: userProfileImage,
            email: user.email
          }
        });
      }
      
      // Clear the form
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get user's initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold mb-6">Comments</h3>
      
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-medium overflow-hidden">
                {userProfiles[user.uid]?.profileImageUrl ? (
                  <img 
                    src={userProfiles[user.uid].profileImageUrl} 
                    alt={userProfiles[user.uid].name || user.displayName || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(userProfiles[user.uid]?.name || user.displayName || user.email)
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                rows="4"
                placeholder="Share your thoughts on this post..."
                required
              ></textarea>
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-gray-500">
                  Posting as{' '}
                  <Link href="/profile" className="text-blue-600 hover:underline">
                    {userProfiles[user.uid]?.name || user.displayName || user.email.split('@')[0]}
                  </Link>
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="dark:text-gray-300">
            Please <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">log in</Link> to leave a comment.
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="py-8 text-center text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading comments...</p>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-8">
          {comments.map(comment => {
            const userProfile = userProfiles[comment.authorId];
            const commentDate = comment.createdAt ? format(comment.createdAt.toDate(), 'MMM dd, yyyy • h:mm a') : '';
            
            return (
              <div key={comment.id} className="border-b pb-6 dark:border-gray-700">
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden">
                      {comment.authorProfileImage || (userProfile && userProfile.profileImageUrl) ? (
                        <img 
                          src={comment.authorProfileImage || userProfile.profileImageUrl} 
                          alt={comment.authorName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(comment.authorName)
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{comment.authorName}</p>
                      {userProfile && userProfile.role === 'admin' && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{commentDate}</p>
                    <div className="text-gray-800 dark:text-gray-300 whitespace-pre-line">
                      {comment.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}