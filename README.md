# FaceAttend — AI-Powered Face Recognition Attendance System

> A full-stack web application that uses real-time face recognition to automate student attendance tracking. Built with Next.js 16 (App Router) on the frontend and a PHP/MySQL backend with Face++ AI API integration.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Folder Structure](#3-folder-structure)
4. [File-by-File Reference](#4-file-by-file-reference)
5. [Pages & Routes](#5-pages--routes)
6. [Components](#6-components)
7. [Hooks](#7-hooks)
8. [API Client (lib/api.js)](#8-api-client-libapiJs)
9. [Styling & Theming](#9-styling--theming)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [User Flows](#11-user-flows)
12. [Backend API Endpoints](#12-backend-api-endpoints)
13. [Error Handling & Solutions](#13-error-handling--solutions)
14. [Environment & Configuration](#14-environment--configuration)
15. [Getting Started](#15-getting-started)
16. [Tech Stack](#16-tech-stack)
17. [Database Schema](#17-database-schema)
18. [State Management Patterns](#18-state-management-patterns)
19. [Component Interaction Map](#19-component-interaction-map)
20. [Security Considerations](#20-security-considerations)
21. [Performance Notes](#21-performance-notes)
22. [Deployment Guide](#22-deployment-guide)
23. [Face++ AI Integration Deep Dive](#23-face-ai-integration-deep-dive)
24. [Browser Compatibility](#24-browser-compatibility)
25. [Frequently Asked Questions](#25-frequently-asked-questions)

---

## 1. Project Overview

FaceAttend is a modern attendance management system designed for educational institutions. Instead of manual roll calls or ID card scanning, students simply look at a webcam and their attendance is recorded automatically using AI face recognition.

### Key Features

- Real-time face recognition via webcam (no app install needed)
- Student self-registration with face enrollment
- Lecturer-controlled attendance sessions (open/close per class)
- Live dashboard with attendance statistics and department analytics
- Student management (view, search, filter, delete)
- Per-lecturer session reports with student rosters
- Responsive design — works on desktop, tablet, and mobile
- 80% attendance rule enforcement with visual progress bars
- Toast notifications for all user actions
- Debug console for development/testing

### Who Uses It

| Role | What They Do |
|------|-------------|
| Student | Visits the home page, looks at camera, clicks "Mark My Attendance" |
| Lecturer | Logs in with Lecturer ID, starts a session for their class, stops it when done |
| Admin | Uses Dashboard and Students pages to monitor attendance data |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Next.js 16  │   │  React 19    │   │  Tailwind CSS 4  │   │
│  │  App Router  │   │  Components  │   │  + Custom CSS    │   │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────┘   │
│         │                  │                                    │
│         └──────────────────┘                                    │
│                    │                                            │
│            lib/api.js (fetch wrapper)                           │
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │  HTTP (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHP Backend (localhost/face-attendance-api)         │
│                                                                 │
│  register.php    recognize.php    session-start.php             │
│  students.php    dashboard-data.php  session-stop.php           │
│  lecturers.php   attendance.php   stats.php                     │
│  check-student.php  delete-student.php  lecturer-report.php     │
│  get-student-photo.php  session-status.php  test.php            │
│                    │                                            │
│              MySQL Database                                     │
│                    │                                            │
│              Face++ AI API (cloud)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
User clicks "Mark My Attendance"
        │
        ▼
CameraCapture component starts 3-second countdown
        │
        ▼
Canvas captures frame from <video> element
        │
        ▼
Image converted to base64 JPEG data URL
        │
        ▼
lib/api.js → recognizeFace(imageData)
        │
        ▼
POST http://localhost/face-attendance-api/api/recognize.php
  Body: { image: "data:image/jpeg;base64,..." }
        │
        ▼
PHP sends image to Face++ API for recognition
        │
        ▼
Face++ returns matched face_token
        │
        ▼
PHP looks up student by face_token in MySQL
        │
        ▼
PHP inserts attendance record (or returns already_marked)
        │
        ▼
JSON response → { success, student, confidence, already_marked }
        │
        ▼
React updates UI: shows student card, toast notification
        │
        ▼
Stats auto-refresh after 30 seconds
```

---

## 3. Folder Structure

```
face-attendance-frontend/
│
├── app/                          ← Next.js App Router pages
│   ├── layout.js                 ← Root HTML layout (metadata, body wrapper)
│   ├── globals.css               ← Global CSS + Tailwind + custom animations
│   ├── favicon.ico               ← Browser tab icon
│   │
│   ├── page.js                   ← / (Home) — face scan & attendance marking
│   │
│   ├── dashboard/
│   │   └── page.js               ← /dashboard — attendance analytics & student grid
│   │
│   ├── register/
│   │   └── page.js               ← /register — new student enrollment (3-step wizard)
│   │
│   ├── students/
│   │   └── page.js               ← /students — view/search/delete all students
│   │
│   ├── lecturer/
│   │   ├── page.js               ← /lecturer — login + session control panel
│   │   └── [id]/
│   │       └── report/
│   │           └── page.js       ← /lecturer/[id]/report — per-lecturer report
│   │
│   ├── simple-camera/
│   │   └── page.js               ← /simple-camera — minimal camera test page
│   │
│   └── test-api/
│       └── page.js               ← /test-api — developer API testing console
│
├── components/                   ← Reusable React components
│   ├── CameraCapture.js          ← Webcam UI with countdown, overlays, capture
│   ├── Navbar.js                 ← Sticky top navigation bar
│   └── LoadingSpinner.js         ← Simple animated loading indicator
│
├── hooks/                        ← Custom React hooks
│   └── useCamera.js              ← Camera stream management hook
│
├── lib/                          ← Utility modules
│   └── api.js                    ← All PHP backend API calls (fetch wrappers)
│
├── public/                       ← Static assets served at /
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── .next/                        ← Next.js build output (auto-generated, gitignored)
├── node_modules/                 ← npm dependencies (gitignored)
│
├── next.config.mjs               ← Next.js configuration
├── tailwind.config.js            ← Tailwind CSS configuration
├── postcss.config.mjs            ← PostCSS configuration
├── jsconfig.json                 ← JS path aliases (@/ → root)
├── eslint.config.mjs             ← ESLint rules
├── package.json                  ← Dependencies and scripts
├── package-lock.json             ← Locked dependency versions
├── .gitignore                    ← Git ignore rules
├── AGENTS.md                     ← AI agent instructions
├── CLAUDE.md                     ← Claude AI instructions
└── README.md                     ← This file
```

---

## 4. File-by-File Reference

### app/layout.js

The root layout wraps every page. It sets the HTML `<html>` and `<body>` tags, imports global CSS, and defines the site-wide metadata.

```
Responsibilities:
  - Sets <html lang="en">
  - Sets viewport meta tag
  - Imports globals.css (Tailwind + animations)
  - Exports metadata: title = "Face Attendance System"
  - Wraps all children in <main className="min-h-screen">
  - Does NOT include Navbar (each page manages its own nav)
```

Why no shared Navbar in layout? Each page has slightly different nav state (active link highlighting), so the nav is rendered per-page for simplicity.

---

### app/globals.css

Global stylesheet loaded by layout.js.

```
Contents:
  @import "tailwindcss"           ← Tailwind v4 import syntax

  Custom CSS variables:
    --animate-fade-in             ← fadeIn keyframe (opacity + translateY)
    --animate-pulse-slow          ← slow pulse animation

  Keyframes defined:
    fadeIn                        ← slides content up from 10px, fades in
    liquidRise                    ← animates height from 0 to --fill-height
    wave                          ← horizontal wave motion for liquid bars
    shimmer                       ← shimmer effect for loading states
    bubbleFloat                   ← floating bubble particles in liquid bars

  Utility classes:
    .liquid-fill                  ← applies liquidRise animation
    .wave-svg                     ← applies wave animation
    .bubble                       ← applies bubbleFloat animation

  Custom scrollbar styles (webkit)
```

---

### app/page.js — Home Page (/)

The main attendance-marking page. This is what students use every day.

```
State:
  isLoading         boolean   — true while recognize.php is processing
  lastAttendance    object    — result of last face scan (success or error)
  capturedImage     string    — base64 of the captured frame (shown in result card)
  todayCount        number    — present students today (from stats.php)
  totalStudents     number    — total enrolled students
  debugInfo         object    — debug console data (shown when debug mode on)
  showDebug         boolean   — toggles debug console visibility

Sub-components (defined inline):
  LiveClock         — updates every second, shows time + date
  StatPill          — small stat card used in the hero banner

Key behaviors:
  - Fetches stats on mount and every 30 seconds
  - handleCapture() sends image to recognize.php, handles success/error/already_marked
  - Auto-clears lastAttendance after 4s (success) or 3-6s (error)
  - Shows identity verification card with live capture vs registered photo side-by-side
  - Debug button in navbar (hidden, small gray text) toggles raw API response view
```

---

### app/dashboard/page.js — Dashboard (/dashboard)

Analytics and student overview page for administrators.

```
State:
  students          array     — list of students with attendance data
  stats             object    — aggregate statistics (total, present, by_department)
  filters           object    — { department, semester, year_intake }
  available         object    — filter options from API
  loading           boolean
  search            string    — text search query
  view              'grid'|'list'
  hoveredId         string    — student ID being hovered (for card overlay)
  now               Date      — live clock (updates every second)
  lastRefresh       Date      — timestamp of last data fetch

Sub-components (defined inline):
  Ring              — SVG circular progress ring (used for attendance %)
  Badge             — colored status badge (Excellent/On Track/Good/Fair/At Risk)
  LiquidBar         — animated liquid fill progress bar with 80% rule marker

Key behaviors:
  - Fetches data on mount and every 60 seconds
  - Re-fetches when filters change
  - Grid view: photo cards with hover overlay showing student ID + registration date
  - List view: table with photo thumbnails
  - Department rings section shows distribution across departments
  - barColor() helper maps attendance % to color (green/blue/amber/red)
```

---

### app/register/page.js — Registration (/register)

3-step wizard for enrolling new students.

```
Steps:
  Step 1 — Student Details form
  Step 2 — Face capture via camera
  Step 3 — Success confirmation

State:
  step              1|2|3     — current wizard step
  formData          object    — { student_id, full_name, department, intake_year, intake_month, semester }
  errors            object    — field-level validation error messages
  touched           object    — which fields have been interacted with
  isLoading         boolean   — true while register.php is processing
  registered        object    — copy of formData on success (shown in step 3)
  idStatus          string    — 'idle'|'checking'|'taken'|'available'
  idOwner           object    — student data if ID is already taken

Validation rules (RULES constant):
  student_id        min 4 characters
  full_name         min 3 letters, no numbers/special chars (regex: /^[a-zA-Z\s''-]{3,}$/)
  department        must not be empty
  year_intake       must have both year and month selected
  semester          must be 1–6

Sub-components (defined inline):
  FieldError        — red error message with warning icon
  FieldHint         — gray hint text below field
  StepIndicator     — 3-step progress indicator with connecting lines
  InputField        — labeled field wrapper with error/hint display

Key behaviors:
  - Student ID is checked against backend with 500ms debounce as user types
  - Shows "taken" banner with owner name if ID already registered
  - Shows "available" green banner when ID is free
  - handleNext() validates all fields before advancing to step 2
  - handleCapture() sends form data + image to register.php
  - handleReset() clears everything and returns to step 1
  - Semester selector uses button grid (1–6) instead of dropdown
  - Live preview card shows entered data before proceeding
```

---

### app/students/page.js — Students (/students)

Full student directory with search, filter, and delete.

```
State:
  students          array     — all registered students
  loading           boolean
  search            string
  filterDept        string    — 'all' or department name
  filterSem         string    — 'all' or semester number
  view              'grid'|'list'
  deletingId        string    — student_id currently being deleted (shows spinner)

Sub-components (defined inline):
  StudentCard       — photo card with semester badge, department, registration date, delete button
  initials()        — helper: extracts initials from full name
  semColor()        — helper: maps semester number to a color from a palette

Key behaviors:
  - Loads all students on mount
  - Delete requires browser confirm() dialog
  - Delete calls deleteStudent() which removes from DB and Face++ faceset
  - Grid: 1-4 columns responsive, photo with gradient overlay
  - List: table with inline photo thumbnails and delete button
  - Stats strip shows total students, departments, showing count, semesters
  - Filters are computed with useMemo for performance
```

---

### app/lecturer/page.js — Lecturer Portal (/lecturer)

Two-screen page: login screen → session control panel.

```
Screens:
  LoginScreen       — shown when no lecturer is authenticated
  SessionPanel      — shown after successful login

LoginScreen state:
  lecturerId        string    — input value
  loading           boolean
  error             string    — error message from validateLecturer()

Authentication:
  - Calls validateLecturer(id) on submit
  - On success: stores lecturer object in localStorage as 'fa_lecturer'
  - On page load: restores from localStorage (avoids login on refresh)
  - Logout: clears localStorage + sessionStorage

SessionPanel state:
  form              object    — { department, semester, course_code, course_name, end_time }
  errors            object    — field validation errors
  loading           boolean
  activeSession     object    — current session data (null if no session running)
  markedCount       number    — students who marked attendance in current session
  pollRef           ref       — interval reference for polling

Session lifecycle:
  Start:
    1. validate() checks all fields
    2. Calls startSession() → session-start.php
    3. Stores session in sessionStorage as 'fa_session'
    4. Polls session-status.php every 30 seconds for live count

  Stop:
    1. Calls stopSession() → session-stop.php
    2. Clears sessionStorage
    3. Resets activeSession to null

  Restore on refresh:
    - Reads sessionStorage on mount
    - Calls getSessionStatus() to verify session is still active
    - If active: restores activeSession state
    - If not: clears sessionStorage

Active session display:
  - Live countdown timer (Countdown component)
  - Marked students count (updates every 30s)
  - Course info, department, semester
  - Stop button
  - Link to report page
```

---

### app/lecturer/[id]/report/page.js — Lecturer Report (/lecturer/[id]/report)

Dynamic route showing a lecturer's full attendance history.

```
Route param:
  [id]              — lecturer ID (e.g. LEC001), accessed via use(params)

State:
  data              object    — full report data from lecturer-report.php
  loading           boolean
  error             string
  tab               'sessions'|'students'
  courseFilter      string    — 'all' or specific course_code
  modal             object    — { type: 'session'|'student', item }

Sub-components (defined inline):
  PctBar            — horizontal percentage bar with color coding
  Modal             — bottom-sheet modal (mobile) / centered modal (desktop)
  SessionModal      — modal showing session roster (present/absent per student)
  StudentModal      — modal showing student's full attendance history

SessionModal behavior:
  - Fetches lecturer-report.php?view=session&session_id=...
  - Shows present/absent/rate stats
  - Table of students with time-in and status
  - Click student photo to open lightbox

StudentModal behavior:
  - Fetches lecturer-report.php?view=student&student_id=...
  - Shows large photo banner with name overlay
  - Stats: sessions attended, absent, rate
  - Table of all sessions with date, course, time-in, status

Course filter:
  - Shown only when lecturer has taught multiple courses
  - Pill buttons to filter sessions/students by course
  - Triggers re-fetch with course_code query param

Tabs:
  My Sessions       — table of all sessions run by this lecturer
  My Students       — table of all students who attended this lecturer's sessions
```

---

### app/simple-camera/page.js — Simple Camera Test (/simple-camera)

Minimal camera test page for debugging camera access issues.

```
Purpose:
  - Isolated camera test without any attendance logic
  - Useful when debugging camera permission issues
  - Shows camera status clearly (ON / error / starting)

Behavior:
  - Starts camera on mount using getUserMedia({ video: true })
  - Cleanup on unmount stops all tracks
  - Capture button draws video frame to canvas → shows as <img>
  - Retry button re-requests camera access
  - No API calls, no face recognition
```

---

### app/test-api/page.js — API Test Console (/test-api)

Developer tool for testing all backend API endpoints.

```
Purpose:
  - Test PHP backend connectivity
  - Test face recognition with live camera
  - Inspect raw API responses

Test buttons:
  Test Connection   → testConnection() → test.php
  Get Students      → getStudents() → students.php
  Test Face Recog.  → recognizeFace(dummyImage) → recognize.php (dummy gray image)

Live camera section:
  - Toggle camera on/off
  - Uses CameraCapture component
  - Shows raw debug info (status, result JSON, error)
  - Shows last attendance result card

Stats section:
  - Shows raw stats.php response as JSON
```

---

## 5. Pages & Routes

```
Route                         File                                  Description
─────────────────────────────────────────────────────────────────────────────────
/                             app/page.js                           Home — face scan
/dashboard                    app/dashboard/page.js                 Analytics dashboard
/register                     app/register/page.js                  Student registration
/students                     app/students/page.js                  Student directory
/lecturer                     app/lecturer/page.js                  Lecturer portal
/lecturer/[id]/report         app/lecturer/[id]/report/page.js      Lecturer report
/simple-camera                app/simple-camera/page.js             Camera debug page
/test-api                     app/test-api/page.js                  API debug console
```

All routes use the Next.js App Router with the `'use client'` directive since they rely on browser APIs (camera, localStorage, sessionStorage).

---

## 6. Components

### components/CameraCapture.js

The main camera UI component used on the Home page, Register page, and Test API page.

```
Props:
  onCapture     function    required  — called with base64 image string after capture
  onClose       function    optional  — if provided, shows a Cancel button
  isLoading     boolean     optional  — shows processing overlay when true (default: false)
  buttonText    string      optional  — label for capture button (default: 'Capture & Submit')

Internal state:
  isCameraReady boolean     — true once getUserMedia succeeds
  error         string      — camera error message
  countdown     number|null — 3, 2, 1 countdown before capture

Camera lifecycle:
  Mount  → useEffect (empty deps) → getUserMedia({ video: { facingMode: 'user' } })
         → sets videoRef.srcObject → setIsCameraReady(true)
  Unmount → cleanup: stop all tracks, set streamRef.current = null

Capture flow:
  startCountdown() → setCountdown(3)
  useEffect watches countdown:
    countdown > 0 → setTimeout 1s → setCountdown(prev - 1)
    countdown === 0 → capture() → setCountdown(null)
  capture():
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    imageData = canvas.toDataURL('image/jpeg', 0.9)
    onCapture(imageData)

Visual overlays (layered on top of <video>):
  Face guide oval    — dashed yellow circle, "Center your face" label
                       shown when: isCameraReady && !isLoading && countdown === null
  Loading overlay    — dark blur + spinner + "Processing face..."
                       shown when: isLoading
  Countdown overlay  — large number (3/2/1) with ping animation
                       shown when: countdown !== null && countdown > 0
  Starting overlay   — spinner + "Starting camera..."
                       shown when: !isCameraReady && !error && !isLoading

Error display:
  Red box with error message + "Reload page" button
  Triggers window.location.reload()

Buttons:
  Capture button     — gradient red, disabled when !isCameraReady || isLoading
  Cancel button      — gray, only shown when onClose prop is provided
```

Visual diagram of CameraCapture layers:

```
┌─────────────────────────────────────┐
│         <video> (live feed)         │
│                                     │
│    ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐    │  ← Face guide oval (dashed)
│    │                           │    │
│    │    Center your face       │    │
│    │                           │    │
│    └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘    │
│                                     │
│  [OR] Loading overlay (dark blur)   │
│  [OR] Countdown: 3 / 2 / 1         │
│  [OR] "Starting camera..." spinner  │
└─────────────────────────────────────┘
         [📸 Capture & Submit]  [✕ Cancel]
         Camera Status: ✅ Ready
```

---

### components/Navbar.js

Sticky top navigation bar used as a standalone component (imported where needed).

```
Props: none

Navigation items (NAV array):
  { path: '/',          label: 'Home'      }
  { path: '/dashboard', label: 'Dashboard' }
  { path: '/register',  label: 'Register'  }
  { path: '/students',  label: 'Students'  }
  { path: '/lecturer',  label: 'Lecturer'  }

Active detection:
  Uses usePathname() from next/navigation
  Active link: text-[#C1121F] bg-red-50 + small red dot indicator

Mobile menu:
  Hamburger button (☰) toggles open state
  Dropdown shows all nav links + Register CTA button
  Clicking any link closes the menu (onClick={() => setOpen(false)})

Note: This component exists but most pages define their own inline nav
for fine-grained control. Navbar.js is available for use but not
currently imported by any page.
```

---

### components/LoadingSpinner.js

Simple centered loading spinner.

```
Props: none

Renders:
  <div role="status" aria-label="Loading">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>

Usage: import LoadingSpinner from '@/components/LoadingSpinner'
       <LoadingSpinner />
```

---

## 7. Hooks

### hooks/useCamera.js

A reusable hook that encapsulates all camera stream logic. An alternative to using CameraCapture component directly when you need more control.

```
Parameters (options object):
  onCapture     function    — callback called with base64 image after capture
  autoCapture   boolean     — if true, starts countdown automatically when camera is ready

Returns:
  videoRef      ref         — attach to <video ref={videoRef}>
  canvasRef     ref         — attach to <canvas ref={canvasRef}> (hidden)
  isCameraReady boolean     — true when stream is active
  error         string|null — camera error message
  countdown     number|null — current countdown value (3, 2, 1, or null)
  startCamera   function    — call to request camera access
  stopCamera    function    — call to stop all tracks
  capture       function    — immediately captures current frame
  startCountdown function   — starts 3-second countdown then captures

Internal implementation:
  streamRef     ref         — holds MediaStream (ref not state, avoids re-render loop)

  startCamera():
    - Stops any existing stream first
    - navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
    - Sets videoRef.current.srcObject = mediaStream
    - Sets isCameraReady = true

  stopCamera():
    - Calls track.stop() on all tracks
    - Sets streamRef.current = null
    - Sets isCameraReady = false

  capture():
    - Draws video frame to canvas
    - Returns canvas.toDataURL('image/jpeg', 0.9)
    - Calls onCapture(imageData) if provided

  startCountdown():
    - Sets countdown = 3
    - setInterval every 1000ms decrements countdown
    - When countdown reaches 1, calls capture() and clears interval

  Auto-capture effect:
    - Watches [autoCapture, isCameraReady]
    - If both true, calls startCountdown()

  Cleanup effect:
    - On unmount: stops all tracks

Usage example:
  const { videoRef, canvasRef, isCameraReady, startCamera, startCountdown } = useCamera({
    onCapture: (imageData) => console.log('Captured:', imageData.length),
    autoCapture: false,
  });
```

---

## 8. API Client (lib/api.js)

All communication with the PHP backend goes through `lib/api.js`. It exports named async functions — no raw `fetch` calls in components.

```
Base URL:
  const API_BASE_URL = 'http://localhost/face-attendance-api/api'
```

### Helper Functions (internal)

```javascript
safeFetch(url, options)
  // POST/PUT requests — expects JSON response starting with '{'
  // Throws if response is not valid JSON
  // Merges Content-Type: application/json header automatically

safeGet(path)
  // GET requests — expects JSON response starting with '{' or '['
  // Throws if response is not valid JSON
```

Both helpers throw a descriptive error if the server returns HTML (e.g. PHP error page) instead of JSON. This prevents silent failures.

---

### Registration Functions

```javascript
registerStudent(data)
  Method:  POST
  URL:     /register.php
  Body:    { student_id, full_name, department, year_intake, semester, image }
           image = base64 data URL (JPEG)
  Returns: { success: boolean, message: string }
  Errors:  Returns { success: false, message } on network failure

checkStudentId(student_id)
  Method:  GET
  URL:     /check-student.php?student_id=...
  Returns: { exists: boolean, student?: { full_name, department } }
  Errors:  Returns { exists: false } on failure (safe default)
```

---

### Face Recognition

```javascript
recognizeFace(image)
  Method:  POST
  URL:     /recognize.php
  Body:    { image: "data:image/jpeg;base64,..." }
  Returns (success):
    {
      success: true,
      student: { name, student_id, department, semester },
      confidence: number,        // 0-100, Face++ similarity score
      timestamp: string,         // time attendance was marked
      already_marked: boolean    // true if already marked today
    }
  Returns (failure):
    {
      success: false,
      message: string,
      not_registered: boolean    // true if face not in system
    }
  Errors:  Returns { success: false, message: 'Network error: ...' }
```

---

### Session Management

```javascript
startSession(data)
  Method:  POST
  URL:     /session-start.php
  Body:    { lecturer_id, lecturer_name, department, semester,
             course_code, course_name, ends_at }
           ends_at format: "YYYY-MM-DD HH:MM:SS"
  Returns: { success: boolean, message: string, session?: { id, ... } }

stopSession(data)
  Method:  POST
  URL:     /session-stop.php
  Body:    { session_id, lecturer_id }
  Returns: { success: boolean, message: string }

getSessionStatus(department, semester)
  Method:  GET
  URL:     /session-status.php?department=...&semester=...
  Returns: { active: boolean, session?: { id, marked_students, ... } }
  Errors:  Returns { active: false, error: message }
```

---

### Student Management

```javascript
getStudents()
  Method:  GET
  URL:     /students.php
  Returns: array of student objects
           [ { student_id, full_name, department, semester, year_intake, registered_at } ]
  Errors:  Returns [] on failure

deleteStudent(student_id)
  Method:  POST
  URL:     /delete-student.php
  Body:    { student_id }
  Returns: { success: boolean, message: string }
```

---

### Dashboard & Analytics

```javascript
getDashboardData({ department, semester, year_intake })
  Method:  GET
  URL:     /dashboard-data.php?department=...&semester=...&year_intake=...
           (params omitted if value is 'all')
  Returns:
    {
      students: [
        {
          student_id, full_name, department, semester, year_intake,
          registered_at, present_days, attendance_percentage
        }
      ],
      statistics: {
        total_students, today_present, today_percentage,
        by_department: [ { department, count } ]
      },
      filters: {
        departments: string[],
        semesters: number[],
        intakes: string[]
      }
    }
  NOTE: Use attendance_percentage directly — do NOT recalculate it.
  Errors:  Returns null on failure

getAttendance(date)
  Method:  GET
  URL:     /attendance.php?date=YYYY-MM-DD
  Returns: { success: boolean, data: attendance records }

getStats()
  Method:  GET
  URL:     /stats.php
  Returns:
    {
      today: {
        present: number,
        total_students: number
      },
      trend: array   // 7-day attendance trend
    }
  Errors:  Returns null on failure
```

---

### Lecturer Authentication

```javascript
validateLecturer(lecturer_id)
  Method:  GET
  URL:     /lecturers.php?action=validate&lecturer_id=LEC001
  Returns (success):
    {
      success: true,
      message: string,
      lecturer: { lecturer_id, full_name, department }
    }
  Returns (failure):
    { success: false, message: string }
  Note: Lecturer IDs are pre-seeded in DB (LEC001–LEC020)

testConnection()
  Method:  GET
  URL:     /test.php
  Returns: any (raw test response)
  Throws:  on network error (not caught — caller handles)
```

---

## 9. Styling & Theming

### Color Palette

```
Primary Red:    #C1121F   — buttons, active links, accents
Dark Red:       #9b0d18   — gradient start (hero banners)
Light Red:      #E63946   — gradient end, hover states
Background:     #F8F9FA   — page background
Text:           #333333   — body text
Border:         #f0f0f0   — card borders
```

### Gradient Usage

```css
/* Hero banners */
background: linear-gradient(135deg, #9b0d18 0%, #C1121F 45%, #E63946 100%)

/* Buttons (primary) */
background: linear-gradient(135deg, #C1121F, #E63946)

/* Logo / avatar */
background: linear-gradient(135deg, #C1121F, #E63946)
```

### Tailwind Configuration

The project uses Tailwind CSS v4 with the new `@import "tailwindcss"` syntax in globals.css. The `tailwind.config.js` file exists for any custom extensions.

### Typography

```
Font stack: 'Inter', 'Segoe UI', sans-serif
Applied inline via style={{ fontFamily: "..." }} on page root divs
```

### Responsive Breakpoints (Tailwind defaults)

```
sm:   640px+    — tablet portrait
md:   768px+    — tablet landscape
lg:   1024px+   — desktop
xl:   1280px+   — wide desktop
```

### Animation Classes (from globals.css)

```
.liquid-fill    — animates height from 0 to 100% over 1.4s (cubic-bezier)
.wave-svg       — horizontal wave motion, 2.5s infinite
.bubble         — floating bubble, 2s ease-in infinite
animate-spin    — Tailwind built-in, used for loading spinners
animate-pulse   — Tailwind built-in, used for live indicators
animate-ping    — Tailwind built-in, used for countdown numbers
```

---

## 10. Data Flow Diagrams

### Attendance Marking Flow

```
Student opens browser → localhost:3000
         │
         ▼
app/page.js mounts
  ├── fetchStats() → GET /stats.php → updates todayCount, totalStudents
  └── CameraCapture mounts → getUserMedia() → video stream starts
         │
         ▼
Student clicks "Mark My Attendance"
         │
         ▼
startCountdown() → countdown: 3 → 2 → 1
         │
         ▼
capture() → canvas.drawImage(video) → toDataURL('image/jpeg', 0.9)
         │
         ▼
handleCapture(imageData) called
  setIsLoading(true)
         │
         ▼
recognizeFace(imageData) → POST /recognize.php
  { image: "data:image/jpeg;base64,/9j/..." }
         │
         ▼
PHP → Face++ API → face detection + search in faceset
         │
    ┌────┴────┐
    │         │
  Match    No match
    │         │
    ▼         ▼
Insert     Return { success: false,
attendance   message: "...",
record       not_registered: true/false }
    │
    ▼
Return { success: true, student: {...},
         confidence: 87.5, already_marked: false }
         │
         ▼
React updates:
  setLastAttendance({ student, confidence, timestamp })
  toast.success("✅ Attendance marked — Ahmad bin Abdullah")
  fetchStats() → updates stat pills
         │
         ▼
After 4 seconds:
  setLastAttendance(null)
  setCapturedImage(null)
  → ready for next student
```

---

### Student Registration Flow

```
Admin/Student opens /register
         │
         ▼
Step 1: Fill form
  ├── Student ID typed → debounce 500ms → checkStudentId()
  │     ├── exists: show "taken" banner with owner name
  │     └── free: show "available" green banner
  │
  ├── Full name typed → live regex validation
  ├── Department selected → validates not empty
  ├── Intake year + month selected → validates both present
  └── Semester button clicked → validates 1-6
         │
         ▼
"Continue to Face Capture" clicked
  validateAll() → checks all RULES
  idStatus must be 'available' (not 'checking' or 'taken')
         │
         ▼
Step 2: Camera opens automatically
  CameraCapture mounts → getUserMedia()
         │
         ▼
Student clicks "Capture & Submit"
  3-second countdown → capture()
         │
         ▼
handleCapture(imageData):
  registerStudent({
    student_id, full_name, department,
    year_intake: "2024 January",
    semester: 3,
    image: "data:image/jpeg;base64,..."
  })
         │
         ▼
POST /register.php
  PHP → Face++ API → detect face → create face_token
  PHP → store face_token + student data in MySQL
         │
    ┌────┴────┐
    │         │
  Success   Failure
    │         │
    ▼         ▼
Step 3:    toast.error(result.message)
Success    Stay on Step 2
card
```

---

### Lecturer Session Flow

```
Lecturer opens /lecturer
         │
         ▼
Check localStorage for 'fa_lecturer'
  ├── Found → restore lecturer, show SessionPanel
  └── Not found → show LoginScreen
         │
         ▼
LoginScreen: enter Lecturer ID (e.g. LEC001)
  validateLecturer(id) → GET /lecturers.php?action=validate&lecturer_id=LEC001
         │
    ┌────┴────┐
    │         │
  Valid    Invalid
    │         │
    ▼         ▼
Store in    Show error
localStorage  message
Show SessionPanel
         │
         ▼
SessionPanel: fill form
  Department, Semester, Course Code, Course Name, End Time
         │
         ▼
"Start Attendance Session" clicked
  validate() → all fields required, end_time must be future
  startSession({...}) → POST /session-start.php
         │
         ▼
Session created in DB
  Store in sessionStorage as 'fa_session'
  setActiveSession(sessionData)
  Poll every 30s: getSessionStatus() → updates markedCount
         │
         ▼
Students can now mark attendance on home page
  (recognize.php checks for active session matching
   student's department + semester)
         │
         ▼
"Stop Session" clicked
  stopSession({ session_id, lecturer_id })
  → POST /session-stop.php
  Clear sessionStorage
  setActiveSession(null)
```

---

## 11. User Flows

### Flow 1: Daily Student Attendance

```
1. Student opens http://localhost:3000
2. Camera starts automatically
3. Student positions face in the oval guide
4. Clicks "Mark My Attendance"
5. Countdown: 3... 2... 1...
6. Photo captured and sent to backend
7. Result shown:
   ✅ Success: student card with name, ID, department, confidence %
              + side-by-side live vs registered photo comparison
   🎉 Already marked: warm toast "Keep it up, [name]!"
   ❌ Not recognized: error card with retry prompt
   🪪 Not registered: error card with "Register Now →" link
8. Result auto-clears after 4 seconds
9. Next student can scan
```

### Flow 2: New Student Registration

```
1. Admin/student opens http://localhost:3000/register
2. Step 1 — Fill in:
   - Student ID (auto-checked for duplicates)
   - Full Name
   - Department (dropdown)
   - Intake Year + Month (two dropdowns)
   - Semester (button grid 1-6)
3. Click "Continue to Face Capture"
4. Step 2 — Camera opens, student looks at camera
5. Click "Capture & Submit" → 3-second countdown
6. Step 3 — Success card shows registered details
7. "Register Another Student" resets to Step 1
```

### Flow 3: Lecturer Starting a Class

```
1. Lecturer opens http://localhost:3000/lecturer
2. Enters Lecturer ID (e.g. LEC003)
3. Selects Department, Semester, enters Course Code + Name, sets End Time
4. Clicks "Start Attendance Session"
5. Active session panel shows:
   - Course info
   - Live countdown to end time
   - "X students marked attendance" (updates every 30s)
6. Students in that department/semester can now mark attendance
7. After class, lecturer clicks "Stop Session"
8. Attendance window closes
```

### Flow 4: Viewing Reports

```
Dashboard (/dashboard):
  - See total students, present today, absent today, attendance rate
  - Department distribution rings
  - Filter by department, semester, intake year
  - Search by name, ID, department
  - Grid or list view
  - Each student card shows attendance % with liquid fill bar
  - 80% rule marker on each bar

Students (/students):
  - Full directory of all registered students
  - Filter by department and semester
  - Delete student (removes from DB + Face++ faceset)

Lecturer Report (/lecturer/[id]/report):
  - Total sessions run, total students, average attendance rate
  - Filter by course
  - Sessions tab: table of all sessions with attendance rate
  - Students tab: table of all students with their attendance %
  - Click any session row → modal with full roster
  - Click any student row → modal with full attendance history
```

---

## 12. Backend API Endpoints

All endpoints are at `http://localhost/face-attendance-api/api/`

```
Endpoint                    Method   Description
──────────────────────────────────────────────────────────────────────
register.php                POST     Register student + enroll face in Face++
check-student.php           GET      Check if student ID already exists
recognize.php               POST     Recognize face + mark attendance
session-start.php           POST     Start an attendance session
session-stop.php            POST     Stop an attendance session
session-status.php          GET      Get current session status
students.php                GET      Get all students (no face tokens)
delete-student.php          POST     Delete student + remove from Face++ faceset
dashboard-data.php          GET      Get students + stats with optional filters
attendance.php              GET      Get attendance records by date
stats.php                   GET      Get today's stats + 7-day trend
lecturers.php               GET      Validate lecturer ID
lecturer-report.php         GET      Get lecturer's sessions + student roster
get-student-photo.php       GET      Serve student photo by student_id
test.php                    GET      Backend connectivity test
```

### Expected Response Shapes

```json
// recognize.php — success
{
  "success": true,
  "student": {
    "name": "Ahmad bin Abdullah",
    "student_id": "LCSMT-NGA-005-ADM-1001530",
    "department": "Computer Software Engineering",
    "semester": 3
  },
  "confidence": 87.5,
  "timestamp": "14:32:05",
  "already_marked": false
}

// recognize.php — not registered
{
  "success": false,
  "message": "Face not found in the system.",
  "not_registered": true
}

// register.php — success
{
  "success": true,
  "message": "Student registered successfully."
}

// stats.php — success
{
  "success": true,
  "data": {
    "today": {
      "present": 42,
      "total_students": 120
    },
    "trend": [...]
  }
}
```

---

## 13. Error Handling & Solutions

### Camera Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unable to access camera. Please check permissions." | Browser denied camera access | Click the camera icon in browser address bar → Allow |
| Camera shows black screen | Another app is using the camera | Close other apps (Zoom, Teams, etc.) |
| "Starting camera..." stuck | getUserMedia never resolves | Reload page; check browser supports getUserMedia |
| Camera works on desktop but not mobile | HTTPS required on mobile | Serve over HTTPS or use localhost |

### API / Network Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Network error. Check if PHP backend is running." | PHP server not started | Start XAMPP/WAMP/Laragon, ensure Apache is running |
| "Server returned non-JSON: ..." | PHP error page returned instead of JSON | Check PHP error logs; fix the PHP error shown in the message |
| "Server returned non-JSON: <!DOCTYPE html>" | Apache showing 404/500 page | Verify path: `localhost/face-attendance-api/api/` exists |
| CORS error in browser console | PHP backend missing CORS headers | Add `header('Access-Control-Allow-Origin: *')` to PHP files |
| Fetch fails silently | API_BASE_URL wrong | Check `lib/api.js` — update `API_BASE_URL` to match your server |

### Face Recognition Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Face not recognized. Please try again." | Low confidence match | Better lighting; face camera directly; remove glasses |
| "Face Not Registered" | Student not enrolled | Go to /register and enroll the student |
| Confidence always low | Poor registration photo | Delete student and re-register with better lighting |
| "Already marked" shown incorrectly | Timezone mismatch | Ensure PHP server timezone matches expected timezone |

### Registration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Student ID is already registered." | Duplicate ID | Use a different student ID |
| "Please wait — verifying Student ID..." | Debounce still running | Wait 500ms after typing before clicking Continue |
| "Registration failed." from PHP | Face++ API error or DB error | Check PHP logs; verify Face++ API key is valid |
| "No face detected in image" | Face not visible in capture | Ensure face is centered and well-lit |

### Session Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Only one active session per department+semester" | Another session already running | Stop the existing session first |
| "End time must be in the future" | Selected past time | Select a time later than current time |
| Session not found on refresh | sessionStorage cleared | Start a new session |
| Students can't mark attendance | No active session | Lecturer must start a session first |

### Build / Development Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Module not found: '@/components/...'` | Path alias not configured | Check `jsconfig.json` has `"@/*": ["./*"]` |
| Hydration mismatch | Server/client render difference | Ensure `'use client'` is at top of files using browser APIs |
| `usePathname` error | Used outside client component | Add `'use client'` directive |
| Camera not working in dev | HTTP (not HTTPS) on non-localhost | Use `localhost` not `127.0.0.1` or IP address |

---

## 14. Environment & Configuration

### jsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

This enables `@/` as an alias for the project root. So `@/components/CameraCapture` resolves to `./components/CameraCapture.js`.

### next.config.mjs

Standard Next.js config. No special modifications documented — check the file for any image domains or experimental flags.

### tailwind.config.js

Tailwind v4 configuration. The main styling is done via `@import "tailwindcss"` in globals.css.

### API Base URL

The backend URL is hardcoded in `lib/api.js`:

```javascript
const API_BASE_URL = 'http://localhost/face-attendance-api/api';
```

To change the backend URL (e.g. for production), update this constant. For environment-based config, you could use:

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api';
```

Then set `NEXT_PUBLIC_API_URL` in a `.env.local` file.

### Student Photo URL Pattern

Photos are served by the PHP backend:

```javascript
const PHOTO_URL = (id) =>
  `http://localhost/face-attendance-api/api/get-student-photo.php?student_id=${id}`;
```

All `<img>` tags using this URL have an `onError` fallback to a gray SVG placeholder.

---

## 15. Getting Started

### Prerequisites

- Node.js 18+ and npm
- PHP 8.0+ with Apache (XAMPP, WAMP, or Laragon recommended)
- MySQL 5.7+
- Face++ API account (free tier available)

### Frontend Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Setup

1. Place the PHP backend folder at: `htdocs/face-attendance-api/` (XAMPP) or equivalent
2. Import the MySQL database schema
3. Configure Face++ API keys in the PHP config file
4. Start Apache and MySQL in XAMPP/WAMP

### Verify Everything Works

1. Open [http://localhost:3000/test-api](http://localhost:3000/test-api)
2. Click "Test Connection" — should return `{ "success": true }`
3. Click "Get Students" — should return an array (empty is fine)
4. Open camera and test face recognition

### Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 16. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.2.2 | App Router, SSR, routing |
| UI Library | React | 19.2.4 | Component model |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Notifications | react-hot-toast | 2.6.0 | Toast notifications |
| HTTP | fetch (native) | — | API calls via lib/api.js |
| Camera | MediaDevices API | — | getUserMedia for webcam |
| Image Capture | Canvas API | — | toDataURL for JPEG export |
| Backend | PHP | 8.0+ | REST API endpoints |
| Database | MySQL | 5.7+ | Student + attendance data |
| AI / Face | Face++ API | — | Face detection + recognition |
| Dev Server | Node.js | 18+ | Next.js dev server |

---

## 17. Database Schema

The MySQL database used by the PHP backend has the following structure. This is provided so you understand what data the frontend is reading and writing.

### Table: students

```sql
CREATE TABLE students (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    VARCHAR(100) UNIQUE NOT NULL,   -- e.g. LCSMT-NGA-005-ADM-1001530
  full_name     VARCHAR(255) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  year_intake   VARCHAR(50)  NOT NULL,           -- e.g. "2024 January"
  semester      INT          NOT NULL,           -- 1 to 6
  face_token    VARCHAR(255),                    -- Face++ face_token from enrollment
  photo_path    VARCHAR(500),                    -- path to stored photo file
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Fields used by frontend:
- `student_id` — displayed in cards, used for photo URL, used for delete
- `full_name` — displayed in all student cards and tables
- `department` — used for filtering and session matching
- `semester` — used for filtering and session matching
- `year_intake` — displayed in student cards
- `registered_at` — displayed as "Registered [date]" in student cards
- `face_token` — never sent to frontend (security), used internally by PHP for Face++ lookup

---

### Table: attendance

```sql
CREATE TABLE attendance (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    VARCHAR(100) NOT NULL,
  session_id    INT,                             -- NULL if no active session
  marked_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  confidence    FLOAT,                           -- Face++ similarity score (0-100)
  UNIQUE KEY unique_daily (student_id, DATE(marked_at))
  -- prevents duplicate attendance on same day
);
```

The `UNIQUE KEY` on `(student_id, DATE(marked_at))` is what causes `already_marked: true` responses — MySQL rejects the duplicate insert and PHP returns the flag.

---

### Table: sessions

```sql
CREATE TABLE sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lecturer_id     VARCHAR(50)  NOT NULL,
  lecturer_name   VARCHAR(255) NOT NULL,
  department      VARCHAR(100) NOT NULL,
  semester        INT          NOT NULL,
  course_code     VARCHAR(50)  NOT NULL,
  course_name     VARCHAR(255) NOT NULL,
  started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  ends_at         DATETIME NOT NULL,             -- reference end time set by lecturer
  stopped_at      DATETIME,                      -- NULL while active
  is_active       TINYINT(1) DEFAULT 1
);
```

A session is "active" when `is_active = 1`. When a student scans their face, `recognize.php` checks for an active session matching their `department` and `semester`. If none exists, attendance is still recorded (session-less mode).

---

### Table: lecturers

```sql
CREATE TABLE lecturers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lecturer_id   VARCHAR(50) UNIQUE NOT NULL,     -- e.g. LEC001
  full_name     VARCHAR(255) NOT NULL,
  department    VARCHAR(100),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Lecturers are pre-seeded (LEC001–LEC020). There is no self-registration for lecturers — an admin adds them directly to the database.

---

### Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│    students     │         │    attendance    │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │◄────────│ student_id (FK)  │
│ student_id      │         │ session_id (FK)  │──────┐
│ full_name       │         │ marked_at        │      │
│ department      │         │ confidence       │      │
│ semester        │         └──────────────────┘      │
│ year_intake     │                                    │
│ face_token      │         ┌──────────────────┐      │
│ photo_path      │         │    sessions      │      │
│ registered_at   │         ├──────────────────┤      │
└─────────────────┘         │ id (PK)          │◄─────┘
                            │ lecturer_id (FK) │──────┐
                            │ department       │      │
                            │ semester         │      │
                            │ course_code      │      │
                            │ course_name      │      │
                            │ started_at       │      │
                            │ ends_at          │      │
                            │ is_active        │      │
                            └──────────────────┘      │
                                                       │
                            ┌──────────────────┐      │
                            │    lecturers     │      │
                            ├──────────────────┤      │
                            │ id (PK)          │◄─────┘
                            │ lecturer_id      │
                            │ full_name        │
                            │ department       │
                            └──────────────────┘
```

---

## 18. State Management Patterns

FaceAttend uses React's built-in state only — no Redux, Zustand, or Context API. Each page manages its own state independently. Here's how each pattern is used:

### useState — Local UI State

```javascript
// Simple boolean flags
const [isLoading, setIsLoading] = useState(false);
const [isCameraReady, setIsCameraReady] = useState(false);

// Object state for forms
const [formData, setFormData] = useState({
  student_id: '', full_name: '', department: '',
  intake_year: '', intake_month: '', semester: '',
});

// Functional update to avoid stale closures
setFormData(prev => ({ ...prev, [name]: value }));
```

### useRef — Mutable Values Without Re-renders

```javascript
// Camera stream — stored in ref NOT state
// If stored in state, every track.stop() would trigger a re-render loop
const streamRef = useRef(null);

// Mounted flag — prevents setState after unmount
const isMounted = useRef(true);
useEffect(() => {
  isMounted.current = true;
  return () => { isMounted.current = false; };
}, []);

// Debounce timer
const debounceRef = useRef(null);
clearTimeout(debounceRef.current);
debounceRef.current = setTimeout(() => { ... }, 500);

// Polling interval
const pollRef = useRef(null);
pollRef.current = setInterval(() => pollStatus(activeSession), 30000);
```

### useCallback — Stable Function References

```javascript
// Prevents re-creating handleCapture on every render
// Important because it's passed as prop to CameraCapture
const handleCapture = useCallback(async (imageData) => {
  // ... async logic
}, [fetchStats]); // only recreates when fetchStats changes

// fetchStats is also memoized
const fetchStats = useCallback(async () => {
  const stats = await getStats();
  if (stats && isMounted.current) {
    setTodayCount(stats.today.present);
  }
}, []); // no deps — stable forever
```

### useEffect — Side Effects & Cleanup

```javascript
// Pattern 1: Run once on mount
useEffect(() => {
  startCamera();
  return () => stopCamera(); // cleanup on unmount
}, []); // empty deps

// Pattern 2: Run when dependency changes
useEffect(() => {
  fetchData();
}, [filters]); // re-fetch when filters change

// Pattern 3: Interval with cleanup
useEffect(() => {
  const t = setInterval(fetchStats, 30000);
  return () => clearInterval(t);
}, [fetchStats]);

// Pattern 4: Countdown timer
useEffect(() => {
  if (countdown === null) return;
  if (countdown === 0) { capture(); setCountdown(null); return; }
  const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
  return () => clearTimeout(timer);
}, [countdown, capture]);
```

### useMemo — Expensive Computations

```javascript
// Filter computation — only recalculates when students/search/filters change
const filtered = useMemo(() => students.filter(s => {
  const q = search.toLowerCase();
  return (
    (!q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q)) &&
    (filterDept === 'all' || s.department === filterDept) &&
    (filterSem  === 'all' || String(s.semester) === String(filterSem))
  );
}), [students, search, filterDept, filterSem]);

// Unique department list
const departments = useMemo(() =>
  ['all', ...new Set(students.map(s => s.department).filter(Boolean))],
[students]);
```

### localStorage vs sessionStorage

```
localStorage  ('fa_lecturer')
  - Persists across browser sessions (tabs, restarts)
  - Used for: lecturer authentication
  - Cleared on: logout button click

sessionStorage  ('fa_session')
  - Persists within a single browser tab session
  - Used for: active attendance session data
  - Cleared on: tab close, stop session, session expired
```

---

## 19. Component Interaction Map

This diagram shows how components and pages relate to each other and which API functions they call.

```
app/page.js (Home)
  ├── renders: CameraCapture
  │     └── calls: onCapture(imageData)
  │           └── handleCapture() in page.js
  │                 └── lib/api.js → recognizeFace()
  │                       └── POST /recognize.php
  ├── calls on mount: lib/api.js → getStats()
  │                       └── GET /stats.php
  ├── inline components:
  │     ├── LiveClock (no API)
  │     └── StatPill (no API)
  └── shows: lastAttendance result card (success/error)

app/register/page.js
  ├── renders: CameraCapture (step 2 only)
  │     └── calls: onCapture(imageData)
  │           └── handleCapture() → lib/api.js → registerStudent()
  │                 └── POST /register.php
  ├── calls on ID input: lib/api.js → checkStudentId()
  │                           └── GET /check-student.php
  └── inline components:
        ├── StepIndicator (no API)
        ├── InputField (no API)
        ├── FieldError (no API)
        └── FieldHint (no API)

app/dashboard/page.js
  ├── calls on mount + filter change: lib/api.js → getDashboardData()
  │                                         └── GET /dashboard-data.php
  └── inline components:
        ├── Ring (SVG, no API)
        ├── Badge (no API)
        └── LiquidBar (no API)

app/students/page.js
  ├── calls on mount: lib/api.js → getStudents()
  │                       └── GET /students.php
  ├── calls on delete: lib/api.js → deleteStudent()
  │                       └── POST /delete-student.php
  └── inline components:
        └── StudentCard (no API, calls onDelete prop)

app/lecturer/page.js
  ├── LoginScreen
  │     └── calls: lib/api.js → validateLecturer()
  │                   └── GET /lecturers.php
  └── SessionPanel
        ├── calls: lib/api.js → startSession()
        │               └── POST /session-start.php
        ├── calls: lib/api.js → stopSession()
        │               └── POST /session-stop.php
        ├── polls: lib/api.js → getSessionStatus()
        │               └── GET /session-status.php
        └── inline components:
              └── Countdown (no API)

app/lecturer/[id]/report/page.js
  ├── calls on mount: fetch() → GET /lecturer-report.php?view=overview
  └── inline components:
        ├── PctBar (no API)
        ├── Modal (no API)
        ├── SessionModal
        │     └── fetch() → GET /lecturer-report.php?view=session
        └── StudentModal
              └── fetch() → GET /lecturer-report.php?view=student

app/test-api/page.js
  ├── renders: CameraCapture
  ├── calls: lib/api.js → testConnection()
  ├── calls: lib/api.js → getStudents()
  ├── calls: lib/api.js → recognizeFace()
  └── calls: lib/api.js → getStats()

app/simple-camera/page.js
  └── (no API calls — camera only)

components/Navbar.js
  └── (no API calls — navigation only)

components/LoadingSpinner.js
  └── (no API calls — UI only)

hooks/useCamera.js
  └── (no API calls — MediaDevices API only)
```

---

## 20. Security Considerations

### What Is Protected

- Face tokens (the Face++ identifiers) are never sent to the frontend. They live only in the MySQL database and are used server-side by PHP.
- Student photos are served through `get-student-photo.php` — the actual file path is never exposed to the browser.
- Lecturer IDs are validated server-side. The frontend cannot forge a lecturer session without a valid ID in the database.

### What Is NOT Protected (Development Defaults)

These are acceptable for a local development/demo setup but should be addressed before any production deployment:

```
Issue                          Risk                    Fix for Production
─────────────────────────────────────────────────────────────────────────
No authentication on pages     Anyone can view          Add login/auth middleware
API_BASE_URL hardcoded         Exposes backend URL      Use env variable
CORS: Allow-Origin: *          Any site can call API    Restrict to your domain
No HTTPS                       Data sent in plain text  Use SSL certificate
No rate limiting on recognize  Brute-force possible     Add rate limiting in PHP
Student delete has no auth     Anyone can delete        Add admin auth
```

### Image Data Handling

When a student captures their face:
1. The image is captured as a base64 JPEG string in the browser
2. It is sent via POST body (JSON) to `recognize.php`
3. PHP forwards it to Face++ API over HTTPS
4. The image is NOT stored permanently during recognition — only during registration
5. During registration, PHP stores the photo file server-side and the face_token in MySQL

### localStorage Security Note

The lecturer object is stored in `localStorage`:
```javascript
localStorage.setItem('fa_lecturer', JSON.stringify(res.lecturer));
```
This means any JavaScript on the page can read it. For production, use HTTP-only cookies or a proper session token instead.

---

## 21. Performance Notes

### Auto-Refresh Intervals

```
Page              Interval    What refreshes
──────────────────────────────────────────────
Home (/)          30 seconds  Stats (present count, total)
Dashboard         60 seconds  Full student + stats data
Lecturer Panel    30 seconds  Marked students count
```

These intervals are set conservatively. The home page refreshes more frequently because it's a live kiosk display.

### Image Optimization

- Captured images use JPEG quality 0.9 (`toDataURL('image/jpeg', 0.9)`)
- This balances recognition accuracy vs payload size
- Typical captured frame: ~80–150 KB as base64 string
- Student photos from `get-student-photo.php` use browser's native caching

### useMemo for Filtering

The student list filtering on `/dashboard` and `/students` uses `useMemo` so the filter computation only runs when the data or filter values actually change — not on every render.

### Camera Stream Management

The camera stream is stored in a `useRef` (not `useState`) to avoid triggering re-renders when the stream starts or stops. This is a critical pattern — storing a MediaStream in state would cause an infinite re-render loop because React would re-run effects on every state change.

### Countdown Timer

The countdown uses `setTimeout` (not `setInterval`) chained via `useEffect`. This is more accurate than `setInterval` because each tick schedules the next one after the previous completes, avoiding drift.

```javascript
// Preferred: chained setTimeout
useEffect(() => {
  if (countdown === 0) { capture(); return; }
  const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
  return () => clearTimeout(timer);
}, [countdown]);
```

---

## 22. Deployment Guide

### Local Development (Current Setup)

```
Frontend:  http://localhost:3000   (Next.js dev server)
Backend:   http://localhost/face-attendance-api/api   (XAMPP Apache)
Database:  localhost:3306   (XAMPP MySQL)
```

### Production Deployment Options

#### Option A: Same Server (VPS/Shared Hosting)

```
1. Build the Next.js app:
   npm run build

2. Start the production server:
   npm run start
   (runs on port 3000 by default)

3. Configure a reverse proxy (Nginx example):

   server {
     listen 80;
     server_name yourdomain.com;

     # Next.js frontend
     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }

     # PHP backend
     location /api/ {
       root /var/www/html/face-attendance-api;
       fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
       include fastcgi_params;
     }
   }

4. Update API_BASE_URL in lib/api.js:
   const API_BASE_URL = 'https://yourdomain.com/api';
```

#### Option B: Vercel (Frontend) + Separate PHP Server

```
1. Push frontend to GitHub

2. Connect to Vercel:
   - Import repository
   - Framework: Next.js (auto-detected)
   - No build config needed

3. Set environment variable in Vercel dashboard:
   NEXT_PUBLIC_API_URL = https://your-php-server.com/face-attendance-api/api

4. Update lib/api.js to use env variable:
   const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api';

5. Deploy PHP backend to any PHP host (cPanel, DigitalOcean, etc.)

6. Add CORS headers to PHP backend for your Vercel domain:
   header('Access-Control-Allow-Origin: https://your-app.vercel.app');
```

#### Option C: Docker (Advanced)

```dockerfile
# Dockerfile for Next.js frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables for Production

Create a `.env.local` file (never commit this):

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.com/face-attendance-api/api

# Optional: disable debug features
NEXT_PUBLIC_SHOW_DEBUG=false
```

### Pre-Deployment Checklist

```
[ ] Update API_BASE_URL to production backend URL
[ ] Enable HTTPS on both frontend and backend
[ ] Restrict CORS to your frontend domain only
[ ] Add authentication to admin pages (dashboard, students)
[ ] Set up database backups
[ ] Configure Face++ API key for production (check rate limits)
[ ] Test camera on target devices (mobile browsers need HTTPS)
[ ] Remove /test-api and /simple-camera routes (or protect them)
[ ] Set PHP error_reporting to 0 in production (no error leakage)
```

---

## 23. Face++ AI Integration Deep Dive

Face++ (Faceplusplus) is the AI service that powers the face recognition. Here's how it integrates with the system.

### How Face++ Works in This System

```
Registration (one-time per student):
  1. Student captures photo → base64 JPEG sent to register.php
  2. PHP calls Face++ Detect API → returns face_token for that photo
  3. PHP calls Face++ FaceSet AddFace API → adds face_token to the school's faceset
  4. PHP stores face_token + student data in MySQL

Recognition (every attendance scan):
  1. Student captures photo → base64 JPEG sent to recognize.php
  2. PHP calls Face++ Search API → searches faceset for matching face
  3. Face++ returns: { face_token, confidence } of best match
  4. PHP looks up student by face_token in MySQL
  5. PHP inserts attendance record
  6. PHP returns student data + confidence to frontend
```

### Confidence Score

The `confidence` value returned by Face++ is a similarity score from 0 to 100:

```
90–100   Very high confidence — almost certainly the same person
75–89    High confidence — reliable match
60–74    Medium confidence — possible match, may need better photo
< 60     Low confidence — likely not a match, PHP should reject
```

The threshold for accepting a match is configured in the PHP backend (typically 70–75).

### Face++ API Endpoints Used

```
POST https://api-us.faceplusplus.com/facepp/v3/detect
  — Detects faces in an image, returns face_token(s)
  — Used during: registration

POST https://api-us.faceplusplus.com/facepp/v3/faceset/addface
  — Adds a face_token to a named faceset
  — Used during: registration

POST https://api-us.faceplusplus.com/facepp/v3/search
  — Searches a faceset for a matching face
  — Used during: attendance marking

POST https://api-us.faceplusplus.com/facepp/v3/faceset/removeface
  — Removes a face_token from the faceset
  — Used during: student deletion
```

### Why Face Recognition Can Fail

```
Cause                          Effect on confidence
─────────────────────────────────────────────────────
Poor lighting (too dark)       Very low — face not detected
Bright backlight               Low — face features washed out
Glasses/hat/mask               Medium-low — partial occlusion
Different angle than registered Medium — pose mismatch
Low camera resolution          Medium — insufficient detail
Multiple faces in frame        Error — ambiguous detection
```

### Face++ Free Tier Limits

```
API calls:    1,000 per month (free tier)
Faceset size: 1,000 faces per faceset
Rate limit:   ~1 request/second
```

For a school with 100 students and 20 daily scans each, that's 2,000 calls/month — exceeds free tier. Consider the paid plan or implement local caching.

---

## 24. Browser Compatibility

### Camera (getUserMedia) Support

```
Browser           Desktop    Mobile
──────────────────────────────────────
Chrome 53+        ✅          ✅ (HTTPS required on mobile)
Firefox 36+       ✅          ✅ (HTTPS required on mobile)
Safari 11+        ✅          ✅ (iOS 11+, HTTPS required)
Edge 12+          ✅          ✅
Opera 40+         ✅          ✅
IE 11             ❌          ❌ (no getUserMedia support)
```

### HTTPS Requirement

On mobile browsers (Chrome for Android, Safari on iOS), `getUserMedia` requires HTTPS. The only exception is `localhost` — which works over HTTP for development.

```
localhost:3000    → HTTP OK (development)
192.168.x.x:3000 → HTTP FAILS on mobile (use HTTPS or localhost)
yourdomain.com    → Must be HTTPS
```

### Canvas API (for image capture)

Supported in all modern browsers. The `toDataURL('image/jpeg', 0.9)` call works in all browsers that support getUserMedia.

### localStorage / sessionStorage

Supported in all modern browsers. May be blocked in:
- Private/Incognito mode (some browsers)
- Browsers with strict privacy settings
- Safari ITP (Intelligent Tracking Prevention) in some configurations

If localStorage is blocked, the lecturer login will not persist across page refreshes.

---

## 25. Frequently Asked Questions

**Q: Why does the camera show a black screen?**
A: Another application (Zoom, Teams, OBS, etc.) is using the camera. Close those apps and reload the page.

**Q: Why does "Face not recognized" appear even though the student is registered?**
A: Common causes: poor lighting, student wearing glasses during scan but not during registration, camera angle too different from registration photo, or Face++ confidence threshold not met. Try re-registering with better lighting.

**Q: Can two students mark attendance at the same time?**
A: No — the system is designed as a kiosk (one student at a time). After each scan, the result auto-clears after 4 seconds for the next student.

**Q: What happens if the PHP backend is down?**
A: All API calls in `lib/api.js` catch errors and return safe defaults (`{ success: false, message: 'Network error...' }`). The UI shows an error toast. The camera still works — only the submission fails.

**Q: Can a student mark attendance without an active session?**
A: Yes — `recognize.php` records attendance regardless of whether a session is active. Sessions are used to associate attendance with a specific course/lecturer, but they don't gate the attendance marking itself.

**Q: Why is the lecturer ID stored in localStorage instead of a cookie?**
A: Simplicity for a local/demo deployment. For production, HTTP-only cookies with a server-side session would be more secure.

**Q: How do I add a new department?**
A: Update the `DEPARTMENTS` array in both `app/register/page.js` and `app/lecturer/page.js`. The dashboard and students pages pull departments dynamically from the API.

**Q: Why does the dashboard show "—" for absent count?**
A: The absent count is calculated as `totalStudents - todayPresent`. If `totalStudents` is 0 (stats not loaded yet or no students registered), it shows "—" instead of a negative number.

**Q: How do I reset a student's face data without deleting them?**
A: Currently there's no "re-enroll" feature. Delete the student from `/students` and re-register them at `/register` with a new photo.

**Q: Why does the countdown use setTimeout instead of setInterval?**
A: `setInterval` can drift over time because it fires regardless of whether the previous callback finished. Chained `setTimeout` is more precise — each tick only starts after the previous one completes.

**Q: The lecturer report shows no students — why?**
A: Students appear in the lecturer report only after they mark attendance in one of that lecturer's sessions. If no sessions have been run yet, or no students scanned during those sessions, the list will be empty.

**Q: Can I use a different face recognition API instead of Face++?**
A: Yes — only the PHP backend needs to change. The frontend just sends a base64 image and expects `{ success, student, confidence }` back. Swap out the Face++ calls in PHP for any other API (AWS Rekognition, Azure Face, etc.) without touching the frontend.

---

## Original Next.js README

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
