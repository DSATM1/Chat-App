# Real-Time Chat Application

A real-time chat application built with HTML, CSS, JavaScript, Node.js, Express, Socket.io, and MongoDB.

## Features

- Real-time messaging using Socket.io
- Multiple chat rooms
- User typing indicators
- Message history stored in MongoDB
- Simple file sharing (simulated)
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a connection string to a remote MongoDB)

## MongoDB Setup

This application can work in two ways:

1. **With MongoDB Atlas** (cloud database):
   - By default, the application attempts to connect to MongoDB Atlas
   - You will need internet access for this to work

2. **With Fallback In-Memory Database**:
   - If MongoDB connection fails, the app automatically switches to an in-memory database
   - Perfect for testing without MongoDB installation
   - **Test User Credentials**:
     - Username: `test`
     - Password: `password`

## Installation

1. Clone the repository or download the files

2. Install dependencies:
   ```
   npm install
   ```

3. Make sure MongoDB is running on your system
   - For local MongoDB: `mongod`
   - Or update the connection string in `server.js` to point to your MongoDB instance

## Running the Application

1. Start the server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Enter a username and password (password validation is not implemented in this demo)
2. Select a chat room from the dropdown
3. Start sending messages
4. You can change rooms using the dropdown menu
5. The typing indicator will show when other users are typing
6. You can simulate file sharing by selecting a file and clicking "Upload File"

## Project Structure

- `server.js` - Main server file with Express, Socket.io, and MongoDB setup
- `public/` - Frontend files
  - `index.html` - HTML structure
  - `styles.css` - CSS styling
  - `script.js` - Client-side JavaScript

## License

This project is open source and available under the [MIT License](LICENSE). 