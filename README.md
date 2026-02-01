Voice Chat Application (Agent–Customer)
A real-time two-way voice chat + text chat application built using WebRTC, Socket.IO, React, and Node.js.
The system strictly allows one Agent and one Customer to connect at a time.

• Two-way real-time voice calling (WebRTC)
• Live text chat
• Role-based connection (Agent ↔ Customer only)
• Prevents same-role connections
• Auto cleanup on disconnect / end call
• Echo-safe (browser-level echo cancellation)
• Low-latency audio
• Works across browsers/devices

Tech Stack:
Frontend
• React
• Socket.IO Client
• WebRTC
• Tailwind CSS
Backend
• Node.js
• Express
• Socket.IO

A. How to Run the Project

1. Clone the Repository
   git clone https://github.com/deepakchauhan27/Voice-Chat-Application.git

2. Setup Backend
   • cd backend
   • npm install
   Start the backend server:
   • npm start
   Backend will run at: http://localhost:5000

3. Setup Frontend
   • npm install
   Start the frontend:
   • npm run dev
   Frontend will run at: http://localhost:5173

B. How to Use the Application

1. Open the app in two different browsers.
2. User 1 selects Agent
3. User 2 selects Customer
4. Wait until status shows Connected
5. Click Start Call / Join Call
6. Start speaking 🎤
7. Use Headphone for the better experience.
8. You can Manage the Unmute and Mute Control
9. Use chat for text messages
10. Click End Call to disconnect

C. Any problems you faced and how you solved them

Problem 1: One-way audio (Agent → Customer only)
Cause:
Customer microphone was initialized after the WebRTC offer was created.
Solution:
• Ensured both Agent and Customer initialize microphone before offer creation
• Used sender’s audio transceivers
• Added proper signalling sequence

Problem 2: Echo in voice call
Cause:
Manual audio processing using Audio Context and Audio Worklet caused delayed audio to loop back.
Solution:
• Removed all custom audio processing
• Relied on browser-level echo cancellation
• Recommended use of headphones

D. Here is my Deployed project you can check out.

https://voice-chat-application.vercel.app/

E. Github repo link:

https://github.com/deepakchauhan27/Voice-Chat-Application
