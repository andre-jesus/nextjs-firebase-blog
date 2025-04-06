import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || status === 'loading') return;
    
    setStatus('loading');
    setErrorMessage('');
    
    try {
      // Add to newsletter subscribers collection
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email,
        createdAt: serverTimestamp(),
        source: 'website'
      });
      
      setStatus('success');
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      setStatus('error');
      setErrorMessage('Failed to subscribe. Please try again.');
    }
  };

  return (
    <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-semibold mb-3">Subscribe to Our Newsletter</h3>
      <p className="text-gray-600 mb-4">
        Get the latest posts delivered directly to your inbox.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
        
        {status === 'success' && (
          <p className="text-green-600 text-sm mt-2">
            Subscribed successfully! Thank you for joining our newsletter.
          </p>
        )}
        
        {status === 'error' && (
          <p className="text-red-600 text-sm mt-2">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}