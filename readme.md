YouTube Clone Backend API 🎬
A fully functional backend API for a YouTube-like platform, built with Node.js, Express, and MongoDB.
This project implements authentication, video and playlist management, likes, subscriptions, and more — designed to be scalable and easy to integrate with any frontend.

🚀 Features
User Authentication & Authorization – JWT-based authentication with role-based access control.

Video Management – Upload, update, delete, and fetch videos.

Likes System – Like/unlike videos, comments, and community posts.

Channel Subscriptions – Subscribe/unsubscribe to channels and fetch subscriber data.

Playlist Management – Create, update, delete playlists with public/private visibility.

Input Validation – Zod schema validation for all request data.

🛠 Tech Stack
Backend: Node.js, Express.js

Database: MongoDB, Mongoose

Authentication: JWT, bcrypt

Validation: Zod

File Uploads: Multer

📂 Project Structure
bash
Copy
Edit
/config        → Database & environment configuration  
/controllers   → Business logic for each feature  
/models        → Mongoose schemas & models  
/routes        → API endpoints  
/middlewares   → Authentication, error handling, validation  
/utils         → Helper functions  
📌 Installation & Setup
bash
Copy
Edit
# Clone the repo
git clone https://github.com/kaushl12/YouTube-backend-Clone.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the server
npm run dev
📄 API Documentation
A Postman collection is included in the repository for easy testing.

🏆 Why This Project?
This project is not just CRUD — it implements real-world backend logic, optimized queries, and production-ready code structure, making it ideal for portfolio and job applications.