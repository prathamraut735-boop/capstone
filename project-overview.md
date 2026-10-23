# Toy Choir TV — Project Overview

**Project type:** Responsive web-based learning platform  
**Client:** The House That Dan Built / Toy Choir  
**Frontend technology:** React + TypeScript + Vite  
**Development approach:** Frontend first, backend later  
**Project status:** Planning and initial frontend development

---

## 1. Project Introduction

Toy Choir TV is an online learning platform designed to help learners explore singing, ukulele and songwriting through structured video lessons and private audio practice submissions.

The platform will extend Toy Choir's existing teaching programme into an online learning experience. It will also provide tools for parents or guardians to manage learner access and bookings, and for teachers to review practice recordings, provide feedback and manage teaching activities.

The website should be simple, welcoming, accessible and easy to use on desktop computers, tablets and mobile phones.

## 2. Project Objectives

The main objectives are to:

1. Provide structured online music lessons.
2. Allow learners to practise and submit private audio recordings.
3. Support teacher-reviewed feedback and controlled learning progression.
4. Allow parents or guardians to manage learner accounts, subscriptions and in-person bookings.
5. Give teachers tools for lesson reviews and in-person session management.
6. Provide administrators with tools to manage lessons, access permissions and platform operations.
7. Design a responsive and accessible interface that protects children's privacy.

## 3. Target Users

### 3.1 Students / Learners

Learners will be able to:
- View their assigned lessons.
- Watch lesson videos.
- Follow practice instructions.
- Submit private audio recordings.
- Review teacher feedback.
- View lesson progress and teacher-approved level progression.

### 3.2 Parents / Guardians

Parents or guardians will eventually be able to:
- Create or manage their accounts.
- Link learner accounts and manage permissions.
- View learner progress.
- Manage free or paid learning access.
- Subscribe to online learning.
- Discover, book and pay for in-person sessions.
- View booking history and manage subscription cancellation.

### 3.3 Teachers

Teachers will eventually be able to:
- View assigned learners and session registrations.
- Listen to private practice recordings.
- Review AI-assisted feedback and provide their own feedback.
- Request a revised practice submission.
- Approve progression to the next level.
- Record attendance.
- Access permitted learner needs information.
- Submit incident reports and manage lesson plans.

### 3.4 Administrators

Administrators will eventually be able to:
- Manage lessons, staff and learner access permissions.
- Verify free-access eligibility.
- Manage content publishing.
- Review support requests and safeguarding cases.
- Handle appropriate data requests and audit records.

## 4. Learning Structure

The proposed online learning structure contains **four levels, with eight lesson slots per level**.

The three curriculum stages described in the client plan are:

1. **Learn to Pitch & Play** — voice, rhythm and beginner ukulele.
2. **Learn to Harmonise** — listening, vocal parts and harmony exercises.
3. **Write & Create Your Own** — lyrics, melody and original songwriting.

Level 1 content is ready. Levels 2–4 should initially contain unpublished lesson placeholders until the relevant content is available.

The exact mapping between the three curriculum stages and the four online levels needs client confirmation. The frontend must not present this mapping as final.

## 5. Main Platform Features

### 5.1 Learning and Lessons

- Four learning levels.
- Eight lesson slots per level.
- Video lesson display.
- Lesson instructions and practice activities.
- Lesson progress tracking.
- Unpublished-content states for unavailable lessons.

### 5.2 Practice and Feedback

- Private audio submissions only.
- Maximum recording duration of four minutes.
- Preview, retake and delete controls.
- Submission status.
- Teacher feedback display.
- Revision requests.
- Teacher-controlled level progression.

AI-assisted analysis is planned for appropriate music-learning tasks. AI feedback must not invent observations when the recording cannot be assessed reliably, and teachers retain final authority.

### 5.3 Parent Accounts and Subscriptions

The future platform will support guardian-linked learner accounts, consent and permissions, free access for verified in-person members or scholarship learners, and monthly subscriptions for other eligible families.

Subscription checkout, payment handling and cancellation will be implemented during a later development stage.

### 5.4 In-Person Session Bookings

The planned booking journey includes:
- Viewing available sessions.
- Reviewing venue, time and availability.
- Selecting a learner.
- Adding a booking to a cart.
- Checkout and payment.
- Confirmation and booking history.

### 5.5 Teacher Portal

The future teacher portal will include learner and session information, attendance registers, practice review, feedback, progression approval, permitted learner-needs information, incident reports and lesson-plan resources.

### 5.6 Administration

Administrative features will include content management, staff permissions, access-entitlement management, support requests, appropriate reporting and audit records.

## 6. Frontend Technology

The initial frontend will use:

- **React:** building reusable interface components.
- **TypeScript:** adding types to make the code easier to maintain and less error-prone.
- **Vite:** running the development server and building the frontend.
- **React Router:** navigating between pages.
- **CSS:** controlling layout, colours, spacing and responsive design.
- **Lucide React:** providing consistent interface icons.

The application should use a clear folder structure and reusable components.

## 7. Backend and External Services

Backend development will happen later, after the frontend structure and user journeys have been reviewed.

The eventual backend will need to support authentication, guardian-learner relationships, permissions, database records, private audio storage, AI processing, subscriptions, payments, bookings and teacher operations.

The final backend technology and service providers have not yet been confirmed.

**Wix is not a dependency for building the application.** The platform should be designed as an independently developed web application. A link or optional integration with Toy Choir's existing Wix website can be considered separately.

## 8. Frontend Development Plan

The frontend will be developed in stages.

### Stage 1 — Project Setup
- Create the React + TypeScript + Vite project.
- Configure routing and global styles.
- Create the shared layout and navigation.
- Define reusable components and mock data.

### Stage 2 — Student Interface
- Student dashboard.
- My Lessons.
- Lesson Details.
- My Practice.
- My Progress.
- My Profile.

### Stage 3 — Parent Interface
- Parent dashboard concept.
- Linked learner overview.
- Subscription and booking interface mockups.

### Stage 4 — Teacher Interface
- Teacher dashboard concept.
- Assigned learners and sessions.
- Practice review and feedback screens.
- Attendance and lesson-plan screens.

### Stage 5 — Admin Interface
- Content management concepts.
- User and access management screens.
- Support and operational queue concepts.

### Stage 6 — Frontend Testing
- Check page navigation.
- Test buttons and interactive components.
- Check mobile and tablet layouts.
- Fix TypeScript and build errors.
- Review accessibility and visual consistency.

### Stage 7 — Backend Integration
After the frontend has been reviewed, plan and implement the backend, authentication, database, private storage, AI services and payment integrations.

## 9. Design Guidelines

The interface should look like a clear, colourful design created in Canva and developed into a website.

Suggested colour palette:
- Primary pink: `#F43F83`
- Purple: `#7856E8`
- Yellow: `#FFD84D`
- Teal: `#55C9C8`
- Background: `#FFFDFB`
- Dark text: `#25204F`

Use rounded cards, friendly illustrations, simple icons, clear buttons and readable typography. Avoid complicated layouts and unnecessary animations.

The design should remain consistent across all user roles.

## 10. Child Safety, Privacy and Accessibility

The platform must be designed around child safety and privacy.

- No public learner profiles.
- No public sharing of practice recordings.
- No open learner-to-learner messaging.
- No student video submissions.
- Private audio access restricted to authorised users.
- Guardian permissions and consent must be supported by the eventual system.
- Teachers control feedback decisions and level progression.
- Do not use real children's personal information or recordings in development.
- Use fictional data for frontend demonstrations.
- Target WCAG 2.2 AA accessibility, subject to verification.

The client plan also requires Australian data storage and appropriate vendor assurances before real-child operation. These requirements must be checked when selecting the backend and external services.

## 11. Development Rules

During frontend development:

1. Use fictional sample data.
2. Do not connect to a real database yet.
3. Do not implement real authentication or payments yet.
4. Do not upload or store real learner recordings.
5. Do not claim AI feedback is working when it is only sample data.
6. Keep frontend code organised and beginner-friendly.
7. Reuse components rather than duplicating code.
8. Make the website responsive.
9. Ensure buttons and navigation work wherever functionality is intended.
10. Clearly identify mock features that require backend integration later.

## 12. Expected Initial Deliverable

The first deliverable is a working frontend demonstration with navigation and sample data.

The initial focus is the student interface. Parent, teacher and administrator interfaces can be added progressively.

The initial deliverable is not a production-ready platform. Backend functionality, real accounts, payments, audio processing, privacy verification and production deployment will require later implementation and testing.

## 13. Project Success Criteria

The frontend phase will be considered successful when:
- The application runs locally without build errors.
- The main pages can be opened through navigation.
- The student learning journey is easy to understand.
- Sample lesson and progress information displays correctly.
- The layout works on desktop, tablet and mobile.
- The interface follows the agreed design guidelines.
- Mock functionality is clearly distinguished from real functionality.
- The code is organised for future backend integration.

---

**Project principle:** Build a simple, functional frontend first; review the design and user journeys; then integrate a secure backend in a later stage.