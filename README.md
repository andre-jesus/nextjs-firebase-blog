# Next.js Firebase Blog

A fully functional blog application built with Next.js and Firebase.

## Features

- 📝 Create, edit, and delete blog posts
- 🔐 User authentication for authors
- 📷 Image uploads for post thumbnails
- 📱 Responsive design for all devices
- 🔍 Category-based post organization
- 📊 Author dashboard

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Content**: React Markdown for rendering post content

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nextjs-firebase-blog
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up your Firebase project:
   - Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage
   - Set up authentication with Email/Password

4. Create a `.env.local` file in the root directory with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/components` - Reusable UI components
- `/lib` - Firebase configuration and utility functions
- `/pages` - Next.js pages and API routes
- `/public` - Static assets
- `/styles` - Global styles and Tailwind configuration

## Deployment

This project can be easily deployed to Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set the environment variables in the Vercel project settings
4. Deploy!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Next.js team for the amazing framework
- Firebase for the backend services
- Tailwind CSS for the styling utilities