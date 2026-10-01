# MediConnect

### AI-Powered Healthcare Consultation & Doctor Discovery Platform

MediConnect is a full-stack healthcare consultation platform that connects patients with doctors based on their symptoms and required medical specialty.

The platform provides AI-assisted specialty detection, doctor discovery, consultation requests, real-time consultation chat, secure medical-document sharing, notifications, appointment management, and video consultation support.

> Built as a full-stack engineering project with a focus on real-world backend architecture, API design, real-time communication, authentication, cloud storage, and AI integration.

---

## 🚀 Live Demo

**[Open MediConnect](https://medi-connect-drab-three.vercel.app/)**

---

## ✨ Key Features

### 👤 Patient

- Secure registration and login
- Describe symptoms in natural language
- AI-assisted medical specialty detection
- Doctor discovery based on specialty and availability
- View doctor profiles and services
- Send consultation requests
- Track consultation status
- Real-time consultation chat
- Secure medical document sharing
- View consultation documents
- Appointment management
- Notifications
- Video consultation support

### 👨‍⚕️ Doctor

- Secure doctor authentication
- Doctor profile management
- Specialty and service management
- Availability management
- Receive consultation requests
- Accept or manage consultations
- Real-time patient communication
- Receive medical documents during consultation
- Consultation management
- Video consultation support

### 🤖 AI Assistant

- Natural-language symptom analysis
- Specialty recommendation
- Support for English, Hindi and Hinglish inputs
- Rule-based medical keyword detection
- LLM-assisted specialty classification for less obvious cases
- Emergency/urgent symptom handling

### 💬 Real-Time Communication

- WebSocket-based consultation chat
- Real-time message delivery
- Real-time document-sharing events
- Consultation-specific communication channels
- Persistent consultation messages

### 📄 Medical Documents

- Private cloud storage
- PDF and image support
- Secure backend-controlled access
- Consultation-based authorization
- File-size and file-type validation
- ZIP upload validation
- In-app document preview

### 🔔 Notifications

- Consultation request notifications
- Consultation status updates
- Document-sharing notifications
- Real-time notification updates

### 💳 Payments

- Sandbox payment flow for consultation services
- Payment records stored in the backend
- Designed so production payment providers can be integrated later

### 🎥 Video Consultation

- Integrated video consultation workflow
- Consultation-specific meeting rooms
- Designed for one-to-one doctor-patient consultations

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Axios
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Uvicorn
- WebSockets
- JWT Authentication

### Database
- PostgreSQL
- Supabase

### Storage
- Supabase Storage

### AI
- Groq API
- LLM-based specialty classification

### Deployment
- Vercel — Frontend
- Render — Backend
- Supabase — PostgreSQL & Storage

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      Patient         │
                         │  Web Browser         │
                         └──────────┬───────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌───────────────────────────────────────────────────────────┐
│                    React Frontend                         │
│                                                           │
│  Authentication │ Doctor Discovery │ Consultation UI     │
│  AI Assistant   │ Chat             │ Documents           │
│  Notifications │ Payments         │ Video Consultation  │
└──────────────────────────┬────────────────────────────────┘
                           │
                           │ REST API / WebSocket
                           ▼
┌───────────────────────────────────────────────────────────┐
│                    FastAPI Backend                        │
│                                                           │
│  Authentication & JWT                                     │
│  Doctor Management                                        │
│  AI Symptom Analysis                                      │
│  Consultation Management                                  │
│  WebSocket Communication                                  │
│  Document Authorization                                   │
│  Notifications                                            │
│  Payment Management                                       │
└───────────────┬───────────────┬───────────────┬───────────┘
                │               │               │
                │               │               │
                ▼               ▼               ▼
       ┌────────────────┐ ┌──────────────┐ ┌───────────────┐
       │   Supabase     │ │    Groq      │ │    Jitsi      │
       │                │ │              │ │               │
       │ PostgreSQL DB  │ │ LLM API      │ │ Video Calls   │
       │ Storage        │ │ AI Analysis  │ │               │
       └────────────────┘ └──────────────┘ └───────────────┘
                │
                ▼
       ┌────────────────────┐
       │ Private Documents  │
       │ PDF / Images / ZIP │
       └────────────────────┘
