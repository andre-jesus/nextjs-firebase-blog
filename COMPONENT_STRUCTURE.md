# Happen Component Structure

This document outlines the React component structure for the Happen event discovery platform.

## Component Hierarchy

- App (Next.js _app.js)
  - ThemeProvider
  - AuthProvider
  - Layout
    - Header
      - Logo
      - Navigation
      - SearchBar
      - UserMenu
      - MobileMenu
    - Main Content
    - Footer
  - Various Pages

## Core Components

### Layout Components

- **Layout.js**: Main layout wrapper
- **Header.js**: Site header with navigation
- **Footer.js**: Site footer
- **Navigation.js**: Main navigation
- **MobileMenu.js**: Mobile navigation overlay
- **UserMenu.js**: User dropdown menu
- **SearchBar.js**: Global search component
- **ThemeToggle.js**: Light/dark theme toggle

### Authentication Components

- **LoginForm.js**: Login form
- **SignupForm.js**: Registration form
- **AuthModal.js**: Modal container for auth forms
- **VenueSignup.js**: Venue-specific registration
- **ProfileForm.js**: Edit profile form
- **UserAvatar.js**: User avatar with status indicator
- **AuthGuard.js**: Route protection wrapper

### Event Components

- **EventCard.js**: Event summary card
- **EventList.js**: List of event cards
- **EventDetail.js**: Event details page content
- **EventForm.js**: Create/edit event form
- **EventGallery.js**: Event image gallery
- **EventCategories.js**: Category display/filter
- **EventMap.js**: Map view of events
- **EventFilters.js**: Filter controls for events
- **AttendeeList.js**: List of event attendees
- **CheckInButton.js**: Button to check in to event

### Map Components

- **MapView.js**: Main map component
- **MapMarker.js**: Custom marker for events/venues
- **MapControls.js**: Zoom, pan, layers controls
- **EventCluster.js**: Grouped event markers
- **LocationSearch.js**: Address/location search
- **MapFilters.js**: Map-specific filters
- **MapInfoWindow.js**: Popup info window

### Venue Components

- **VenueCard.js**: Venue summary card
- **VenueDetail.js**: Venue details page content
- **VenueForm.js**: Create/edit venue form
- **VenueGallery.js**: Venue image gallery
- **VenueReviews.js**: Reviews for a venue
- **VenueEvents.js**: Events at a venue
- **VenueMap.js**: Map focused on venue location
- **VenueStats.js**: Stats/metrics for venue

### Social Components

- **FriendList.js**: List of user's friends
- **FriendRequests.js**: Friend request manager
- **ActivityFeed.js**: Social activity feed
- **CheckInForm.js**: Form for creating check-ins
- **CheckInCard.js**: Display of a check-in
- **ReviewForm.js**: Form for creating reviews
- **ReviewCard.js**: Display of a review
- **UserFollow.js**: Follow button and counter
- **NotificationList.js**: User notifications

### Saved Events / Mood Board

- **MoodBoard.js**: Container for saved events
- **SavedEventList.js**: List of saved events
- **CollectionsList.js**: List of user collections
- **CollectionForm.js**: Create/edit collection
- **SaveButton.js**: Save event to collection button
- **RemindButton.js**: Set reminder for event

## Page Structure

### Main Pages

- **index.js**: Homepage / Discovery
- **map.js**: Map-focused event discovery
- **events/**
  - **index.js**: All events listing
  - **[id].js**: Single event detail
  - **create.js**: Create new event
- **venues/**
  - **index.js**: All venues listing
  - **[id].js**: Single venue detail
  - **create.js**: Create new venue
- **profile/**
  - **index.js**: User profile
  - **edit.js**: Edit profile
  - **settings.js**: User settings
- **social/**
  - **friends.js**: Friends management
  - **feed.js**: Social activity feed
  - **check-ins.js**: User's check-ins
- **moodboard/**
  - **index.js**: User's saved events
  - **collections.js**: User's collections
- **login.js**: Login page
- **signup.js**: Signup page
- **404.js**: Not found page

## Key Pages Functionality

### Homepage / Discovery Page

The homepage serves as the main discovery platform featuring:
- Toggle between list and map views of events
- Category and date filters
- Location-based filtering
- Featured events section
- Personalized recommendations based on user preferences

### Event Detail Page

The event detail page shows comprehensive information about an event:
- Event title, date, time, and location
- Image gallery
- Detailed description
- Venue information
- Price and ticket information
- Attendee list
- Check-in functionality
- Reviews and ratings
- Map location
- Related events
- Save to mood board option

### Map Page

The map-focused discovery page displays:
- Interactive map with event markers
- Color-coded categories
- Filtering controls
- Location search
- Current location detection
- Radius-based search
- Event cards for selected events

### Venue Profile Page

The venue page displays:
- Venue details and description
- Photo gallery
- Contact information and opening hours
- Ratings and reviews
- Upcoming events at the venue
- Map location
- Follow venue functionality

### User Profile Page

The user profile page features:
- User details and profile picture
- Events attended and upcoming
- Reviews written
- Check-ins
- Friends list
- Followed venues and categories
- Mood board preview

### Social Feed Page

The social feed displays:
- Friend check-ins and activity
- Friend's upcoming events
- New venue follows
- Recommendations based on friend activity
- Trending events in user's network

## Component Relationships

The diagram below outlines key component relationships:

- **Layout** wraps all pages
- **EventCard** is used in multiple contexts (lists, search results, recommendations)
- **MapView** is reused in event detail, venue pages, and the map discovery page
- **AuthGuard** protects routes requiring authentication
- **UserMenu** appears in the header and provides access to user-specific features
- **EventFilters** is used on both list and map views for consistent filtering
