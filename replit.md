# Bong Bari - Bengali Comedy Platform

## Overview

Bong Bari is a full-stack web application for a Bengali comedy content platform. The project features a React frontend with TypeScript, an Express.js backend, and a PostgreSQL database managed through Drizzle ORM. The platform is designed to showcase Bengali comedy shorts and provide blog functionality for sharing behind-the-scenes content and cultural commentary.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite build system
- **Styling**: Tailwind CSS with custom brand colors (yellow, red, blue) and Shadcn/ui component library
- **Typography**: Google Fonts integration with Bengali font support (Poppins, Baloo Da 2)
- **Routing**: Wouter for client-side routing with pages for Home, About, Work with Us, Contact, and Blog
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Comprehensive Radix UI-based component system with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging middleware
- **Development**: Hot-reload development server with Vite integration in development mode
- **Build**: ESBuild for production bundling with external package handling

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Defined in shared schema file with users and blog_posts tables
- **Validation**: Zod schemas for runtime type checking and API validation
- **Storage Interface**: Abstract storage layer with in-memory implementation for development and database implementation for production

### Authentication & Security
- **Session Management**: PostgreSQL session storage with connect-pg-simple
- **Data Validation**: Comprehensive input validation using Zod schemas
- **Error Handling**: Centralized error handling with appropriate HTTP status codes

### Content Management
- **Blog System**: Full CRUD operations for blog posts with slug-based routing
- **SEO Optimization**: Dynamic meta tags, structured data, and semantic HTML
- **Media Integration**: YouTube video embedding and social media integration
- **Multilingual Support**: Bengali and English content with appropriate font loading

### Development Tools
- **Build System**: Vite for frontend bundling with path aliases and asset handling
- **Database Management**: Drizzle Kit for schema migrations and database operations
- **Code Quality**: TypeScript strict mode with comprehensive type definitions
- **Development Experience**: Runtime error overlays and Replit-specific development tools

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless deployment
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router

### UI & Styling
- **@radix-ui/***: Comprehensive accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe CSS class composition
- **lucide-react**: Icon library

### Development & Build Tools
- **vite**: Frontend build tool and development server
- **esbuild**: JavaScript bundler for backend
- **tsx**: TypeScript execution for development
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

### Database & Validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation
- **zod**: Runtime type validation
- **connect-pg-simple**: PostgreSQL session store

### Additional Libraries
- **date-fns**: Date manipulation utilities
- **react-hook-form**: Form handling with validation
- **embla-carousel-react**: Carousel component for media display