# Happen - Event Discovery & Social Platform

## Project Overview
Happen is an innovative event discovery and social platform designed to connect people with a diverse range of events. The app utilizes social features, curated recommendations, and a user-friendly interface to provide a seamless and engaging user experience.

## Tech Stack
- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Firebase (Authentication, Firestore, Storage, Cloud Functions)
- **Maps Integration**: Mapbox/Google Maps API
- **State Management**: React Context API / Redux
- **Styling**: TailwindCSS with dark mode support
- **Deployment**: Vercel (Frontend), Firebase (Backend)

## Core Features

### 1. Personalized Event Recommendations
- Curated recommendations based on user preferences
- "Follow" feature for venues, artists, and event categories
- "Mood Board" for saving interesting events

### 2. Interactive Event Map
- Events displayed on an interactive map with color-coded categories
- Filters for location, date, time, category, and price range
- "Nearby Events" feature using geolocation

### 3. Social Features
- Event check-ins with photos and comments
- Social feed showing friends' activities and recommended events
- Friend connections to discover mutual interests

### 4. Venue Profiles
- Detailed venue information (history, atmosphere, upcoming events)
- User reviews and ratings
- Venue updates and promotions

### 5. Event Recaps and Memories
- Monthly/yearly personalized event summaries
- Photo and video storage from events
- "Memories" timeline to revisit past events

## Project Structure

### User-Facing Components
1. **User Authentication & Profile**
   - Registration/login (email, social options)
   - Profile management
   - Preference settings
   - Following functionality
   - Mood board of saved events
   - Friend finder

2. **Event Discovery**
   - Interactive map
   - Advanced search and filtering
   - Event detail pages
   - Personalized recommendations
   - Nearby events feature

3. **Social Interaction**
   - Event check-ins
   - Social feed
   - Photo/video uploads
   - Reviews and ratings

4. **Event Memories**
   - Automated recaps
   - Memories timeline

### Venue-Facing Components
1. **Venue Portal**
   - Registration and profile management
   - Event creation and management
   - Promotions and updates
   - Review management
   - Analytics dashboard

### Backend Infrastructure
1. **Database Design**
   - User collection
   - Events collection
   - Venues collection
   - Social interactions collection

2. **API Endpoints**
   - Authentication services
   - Event services
   - Venue services
   - Social services
   - Map services

3. **Cloud Functions**
   - Event recommendations
   - Notifications
   - Recap generation

## Development Roadmap

### Phase 1: Core Infrastructure & MVP
- [x] Project setup with Next.js & Firebase
- [ ] Authentication system (user & venue)
- [ ] Basic user profiles
- [ ] Event database design
- [ ] Simple event listings page
- [ ] Basic map integration

### Phase 2: Event Discovery Features
- [ ] Advanced search & filtering
- [ ] Interactive map with filters
- [ ] Event detail pages
- [ ] Follow functionality
- [ ] Mood board for saved events

### Phase 3: Social Features
- [ ] Friend connections
- [ ] Social feed
- [ ] Event check-ins
- [ ] Photo/video uploads
- [ ] Ratings & reviews

### Phase 4: Venue Portal
- [ ] Venue profiles & management
- [ ] Event creation tools
- [ ] Promotion features
- [ ] Analytics dashboard

### Phase 5: Advanced Features & Polish
- [ ] Personalized recommendations
- [ ] Event recaps & memories
- [ ] Performance optimizations
- [ ] UI/UX refinements

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Firebase account
- Mapbox/Google Maps API key

### Installation
1. Clone the repository
   ```
   git clone https://github.com/yourusername/happen.git
   cd happen
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   - Create a `.env.local` file in the root directory
   - Add your Firebase and Maps API credentials

4. Start the development server
   ```
   npm run dev
   ```

## Project Structure (Code)
```
happen/
├── components/           # Reusable React components
│   ├── auth/             # Authentication related components
│   ├── events/           # Event display components
│   ├── layout/           # Layout components (Header, Footer, etc.)
│   ├── map/              # Map related components
│   ├── social/           # Social feature components
│   └── venues/           # Venue related components
├── lib/                  # Utility functions and service connections
│   ├── firebase.js       # Firebase configuration
│   ├── mapService.js     # Map service integration
│   └── recommendations.js # Recommendation engine
├── pages/                # Next.js pages
│   ├── api/              # API routes
│   ├── events/           # Event pages
│   ├── profile/          # Profile pages
│   ├── venues/           # Venue pages
│   └── index.js          # Home page
├── public/               # Static assets
├── styles/               # Global styles
├── firebase/             # Firebase related functions
│   ├── functions/        # Cloud functions
│   └── rules/            # Security rules
└── utils/                # Helper functions
```

## Firebase Collections Design

### Users Collection
```
users/
├── {userId}/
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── createdAt: timestamp
│   ├── bio: string
│   ├── location: geopoint
│   ├── preferences: {
│   │   ├── categories: array<string>
│   │   ├── maxDistance: number
│   │   └── priceRange: array<number>
│   │ }
│   ├── following: {
│   │   ├── venues: array<venueId>
│   │   ├── categories: array<string>
│   │   └── artists: array<artistId>
│   │ }
│   └── friends: array<userId>
```

### Events Collection
```
events/
├── {eventId}/
│   ├── name: string
│   ├── description: string
│   ├── venueId: string
│   ├── organizer: string
│   ├── startDateTime: timestamp
│   ├── endDateTime: timestamp
│   ├── location: geopoint
│   ├── address: string
│   ├── categories: array<string>
│   ├── images: array<string>
│   ├── price: {
│   │   ├── min: number
│   │   └── max: number
│   │ }
│   ├── capacity: number
│   ├── attendees: array<userId>
│   └── featured: boolean
```

### Venues Collection
```
venues/
├── {venueId}/
│   ├── name: string
│   ├── description: string
│   ├── location: geopoint
│   ├── address: string
│   ├── images: array<string>
│   ├── categories: array<string>
│   ├── amenities: array<string>
│   ├── hours: object
│   ├── contactInfo: {
│   │   ├── phone: string
│   │   ├── email: string
│   │   └── website: string
│   │ }
│   ├── ratings: {
│   │   ├── average: number
│   │   └── count: number
│   │ }
│   └── verified: boolean
```

### Social Interactions
```
checkIns/
├── {checkInId}/
│   ├── userId: string
│   ├── eventId: string
│   ├── timestamp: timestamp
│   ├── photo: string
│   └── comment: string

reviews/
├── {reviewId}/
│   ├── userId: string
│   ├── targetId: string (venueId or eventId)
│   ├── targetType: string ("venue" or "event")
│   ├── rating: number
│   ├── content: string
│   ├── timestamp: timestamp
│   └── photos: array<string>

moodBoard/
├── {userId}/
│   └── events: array<eventId>
```

## Implementation Plan

### Phase 1: Foundation Transformation
1. Update database schema in Firebase
2. Modify authentication to include venue accounts
3. Transform basic UI components for events
4. Create simple event listing functionality

### Phase 2: Map Integration & Event Discovery
1. Integrate map library
2. Develop event search and filtering
3. Create venue profiles
4. Build event detail pages

### Phase 3: Social Features
1. Implement friend connections
2. Develop check-in functionality
3. Create social feed
4. Build review and rating system

### Phase 4: Advanced Features
1. Develop recommendation engine
2. Create mood board for saved events
3. Implement event recaps and memories
4. Add push notifications for events

### Phase 5: Polish & Optimization
1. Refine UI/UX for all components
2. Optimize performance for map and images
3. Implement comprehensive testing
4. Prepare for deployment
