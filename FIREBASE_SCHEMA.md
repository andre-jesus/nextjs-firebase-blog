# Happen - Firebase Schema Design

This document outlines the Firestore database schema for the Happen event discovery platform.

## Collections Overview

1. **users** - User profiles and preferences
2. **venues** - Venue profiles and details
3. **events** - Event listings and details
4. **categories** - Event and venue categories
5. **checkIns** - User event check-ins
6. **reviews** - Venue and event reviews
7. **followers** - Following relationships
8. **friends** - Friend connections
9. **moodBoard** - Saved events
10. **notifications** - User notifications
11. **eventMemories** - Generated event recaps

## Detailed Schema

### Users Collection

```
users/{userId}
│
├── displayName: string
├── email: string
├── photoURL: string
├── createdAt: timestamp
├── lastActive: timestamp
├── bio: string
├── location: {
│   ├── geopoint: GeoPoint
│   └── address: string
│ }
├── preferences: {
│   ├── categories: array<string>
│   ├── maxDistance: number
│   ├── priceRange: {
│   │   ├── min: number
│   │   └── max: number
│   │ }
│   └── notificationSettings: {
│       ├── eventReminders: boolean
│       ├── friendActivity: boolean
│       ├── venueUpdates: boolean
│       └── recommendations: boolean
│   }
│ }
├── stats: {
│   ├── eventsAttended: number
│   ├── checkIns: number
│   ├── reviews: number
│   ├── followers: number
│   └── following: number
│ }
├── isVenueAccount: boolean
└── venueId: string (if isVenueAccount is true)
```

### Venues Collection

```
venues/{venueId}
│
├── name: string
├── slug: string (URL-friendly name)
├── ownerId: string (userId of admin)
├── description: string
├── shortDescription: string
├── location: {
│   ├── geopoint: GeoPoint
│   ├── address: string
│   ├── city: string
│   ├── state: string
│   ├── country: string
│   └── postalCode: string
│ }
├── contactInfo: {
│   ├── phone: string
│   ├── email: string
│   ├── website: string
│   ├── instagram: string
│   ├── facebook: string
│   └── twitter: string
│ }
├── images: array<string> (URLs)
├── coverImage: string (URL)
├── logoImage: string (URL)
├── categories: array<string>
├── amenities: array<string>
├── capacity: number
├── hoursOfOperation: {
│   ├── monday: { open: string, close: string }
│   ├── tuesday: { open: string, close: string }
│   ...
│   └── sunday: { open: string, close: string }
│ }
├── ratings: {
│   ├── average: number
│   ├── count: number
│   └── distribution: {
│       ├── 1: number
│       ├── 2: number
│       ├── 3: number
│       ├── 4: number
│       └── 5: number
│   }
│ }
├── pricing: string (e.g., "$", "$$", "$$$")
├── createdAt: timestamp
├── updatedAt: timestamp
├── verified: boolean
├── featured: boolean
└── status: string ("active", "closed", "temporarily_closed")
```

### Events Collection

```
events/{eventId}
│
├── name: string
├── slug: string (URL-friendly name)
├── description: string
├── shortDescription: string
├── venueId: string (reference to venues collection)
├── venueName: string (denormalized for performance)
├── organizerId: string (can be either userId or venueId)
├── organizerName: string
├── startDateTime: timestamp
├── endDateTime: timestamp
├── location: {
│   ├── geopoint: GeoPoint
│   ├── address: string
│   ├── city: string
│   ├── state: string
│   ├── country: string
│   └── venueId: string (if at an existing venue)
│ }
├── images: array<string> (URLs)
├── coverImage: string (URL)
├── categories: array<string>
├── tags: array<string>
├── featuredArtists: array<string>
├── price: {
│   ├── min: number
│   ├── max: number
│   ├── currency: string
│   └── isFree: boolean
│ }
├── ticketUrl: string
├── capacity: number
├── attendeeCount: number
├── interestedCount: number
├── status: string ("scheduled", "cancelled", "postponed")
├── visibility: string ("public", "private", "unlisted")
├── recurring: boolean
├── recurrencePattern: string (if recurring)
├── ratings: {
│   ├── average: number
│   └── count: number
│ }
├── createdAt: timestamp
├── updatedAt: timestamp
└── featured: boolean
```

### Categories Collection

```
categories/{categoryId}
│
├── name: string
├── slug: string
├── description: string
├── icon: string (URL or icon code)
├── color: string (hex code)
├── parent: string (parent category if this is a subcategory)
├── eventCount: number
└── isActive: boolean
```

### CheckIns Collection

```
checkIns/{checkInId}
│
├── userId: string
├── userName: string (denormalized)
├── userPhotoURL: string (denormalized)
├── eventId: string
├── eventName: string (denormalized)
├── venueId: string
├── venueName: string (denormalized)
├── timestamp: timestamp
├── location: GeoPoint
├── photos: array<string> (URLs)
├── comment: string
├── isPublic: boolean
├── mood: string (optional)
└── tags: array<userId> (tagged friends)
```

### Reviews Collection

```
reviews/{reviewId}
│
├── userId: string
├── userName: string (denormalized)
├── userPhotoURL: string (denormalized)
├── targetId: string (venueId or eventId)
├── targetType: string ("venue" or "event")
├── targetName: string (denormalized)
├── rating: number (1-5)
├── title: string
├── content: string
├── photos: array<string> (URLs)
├── helpful: number (count of users finding it helpful)
├── createdAt: timestamp
├── updatedAt: timestamp
└── status: string ("published", "flagged", "removed")
```

### Followers Collection

```
followers/{followId}
│
├── followerId: string (user who is following)
├── followeeId: string (venue, category, or user being followed)
├── followeeType: string ("user", "venue", "category")
├── createdAt: timestamp
└── notificationsEnabled: boolean
```

### Friends Collection

```
friends/{friendshipId}
│
├── userId: string
├── friendId: string
├── status: string ("pending", "accepted", "declined")
├── initiatedBy: string (userId who sent request)
├── createdAt: timestamp
├── updatedAt: timestamp
└── lastInteraction: timestamp
```

### MoodBoard Collection

```
moodBoard/{userId}
│
├── savedEvents: array<{
│   ├── eventId: string
│   ├── addedAt: timestamp
│   ├── notes: string
│   └── reminder: timestamp (optional)
│ }>
└── collections: array<{
    ├── name: string
    ├── description: string
    └── events: array<string> (eventIds)
}>
```

### Notifications Collection

```
notifications/{notificationId}
│
├── userId: string (recipient)
├── type: string ("event_reminder", "friend_request", "check_in", "venue_update", etc.)
├── title: string
├── message: string
├── sourceId: string (related entity - userId, eventId, venueId, etc.)
├── sourceType: string ("user", "event", "venue", etc.)
├── read: boolean
├── createdAt: timestamp
└── expiresAt: timestamp
```

### EventMemories Collection

```
eventMemories/{userId}
│
├── period: string ("monthly", "yearly")
├── date: string (YYYY-MM for monthly, YYYY for yearly)
├── title: string
├── description: string
├── stats: {
│   ├── totalEvents: number
│   ├── categories: map<string, number>
│   ├── topVenues: array<{
│   │   ├── venueId: string
│   │   ├── venueName: string
│   │   └── count: number
│   │ }>
│   └── friends: array<{
│       ├── userId: string
│       ├── userName: string
│       └── eventsTogether: number
│   }>
│ }
├── events: array<{
│   ├── eventId: string
│   ├── eventName: string
│   ├── date: timestamp
│   ├── venueId: string
│   ├── venueName: string
│   └── photoURL: string (optional)
│ }>
├── highlightPhotos: array<string>
└── createdAt: timestamp
```

## Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isVenueOwner(venueId) {
      return isSignedIn() && exists(/databases/$(database)/documents/venues/$(venueId)) &&
             get(/databases/$(database)/documents/venues/$(venueId)).data.ownerId == request.auth.uid;
    }
    
    function isEventOrganizer(eventId) {
      return isSignedIn() && exists(/databases/$(database)/documents/events/$(eventId)) &&
             get(/databases/$(database)/documents/events/$(eventId)).data.organizerId == request.auth.uid;
    }
    
    // Users collection
    match /users/{userId} {
      allow read;
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Venues collection
    match /venues/{venueId} {
      allow read;
      allow create: if isSignedIn();
      allow update: if isVenueOwner(venueId);
      allow delete: if isVenueOwner(venueId);
    }
    
    // Events collection
    match /events/{eventId} {
      allow read;
      allow create: if isSignedIn();
      allow update: if isEventOrganizer(eventId) || isVenueOwner(resource.data.venueId);
      allow delete: if isEventOrganizer(eventId);
    }
    
    // Categories collection
    match /categories/{categoryId} {
      allow read;
      allow write: if false;  // Only admins can modify via Admin SDK
    }
    
    // CheckIns collection
    match /checkIns/{checkInId} {
      allow read;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // Followers collection
    match /followers/{followId} {
      allow read;
      allow create: if isSignedIn() && request.resource.data.followerId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.followerId == request.auth.uid;
    }
    
    // Friends collection
    match /friends/{friendshipId} {
      allow read: if isSignedIn() && 
                  (resource.data.userId == request.auth.uid || resource.data.friendId == request.auth.uid);
      allow create: if isSignedIn() && 
                   (request.resource.data.userId == request.auth.uid || request.resource.data.friendId == request.auth.uid);
      allow update, delete: if isSignedIn() && 
                           (resource.data.userId == request.auth.uid || resource.data.friendId == request.auth.uid);
    }
    
    // MoodBoard collection
    match /moodBoard/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // EventMemories collection
    match /eventMemories/{memoryId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow write: if false;  // Generated by server-side functions only
    }
  }
}
```

## Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Allow public read for event and venue images
    match /events/{eventId}/{imageId} {
      allow read;
      allow write: if isSignedIn() && 
                   exists(/databases/$(database)/documents/events/$(eventId)) &&
                   get(/databases/$(database)/documents/events/$(eventId)).data.organizerId == request.auth.uid;
    }
    
    // Venue images
    match /venues/{venueId}/{imageId} {
      allow read;
      allow write: if isSignedIn() && 
                   exists(/databases/$(database)/documents/venues/$(venueId)) &&
                   get(/databases/$(database)/documents/venues/$(venueId)).data.ownerId == request.auth.uid;
    }
    
    // User profile images
    match /users/{userId}/{imageId} {
      allow read;
      allow write: if isOwner(userId);
    }
    
    // Check-in images
    match /checkIns/{checkInId}/{imageId} {
      allow read;
      allow write: if isSignedIn() && 
                   exists(/databases/$(database)/documents/checkIns/$(checkInId)) &&
                   get(/databases/$(database)/documents/checkIns/$(checkInId)).data.userId == request.auth.uid;
    }
    
    // Review images
    match /reviews/{reviewId}/{imageId} {
      allow read;
      allow write: if isSignedIn() && 
                   exists(/databases/$(database)/documents/reviews/$(reviewId)) &&
                   get(/databases/$(database)/documents/reviews/$(reviewId)).data.userId == request.auth.uid;
    }
  }
}
```
