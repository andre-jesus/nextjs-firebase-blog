import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../models/userModel';

/**
 * Hook for redirecting users based on authentication state and account type
 * @returns {Object} Authentication state and loading state
 */
export function useAuthRedirect() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  
  useEffect(() => {
    const checkUserType = async () => {
      if (!loading && user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          
          if (userProfile?.isVenueAccount) {
            router.push('/venue-dashboard');
          } else {
            router.push('/map');
          }
        } catch (error) {
          console.error('Error checking user type:', error);
          // Default to regular user view
          router.push('/map');
        }
      }
    };
    
    checkUserType();
  }, [user, loading, router]);
  
  return { user, loading };
}
