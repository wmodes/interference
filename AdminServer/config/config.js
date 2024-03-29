// config.js
// This file contains the configuration for the server

// WARNNG: This file is hardlinked to server/config.js and audio/config/config.js

// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  server: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    logfile: '/Users/wmodes/dev/interference/logs/server.log',
  },
  audioServer: {
    protocol: 'http',
    host: 'localhost',
    port: 8081,
    logfile: '/Users/wmodes/dev/interference/logs/audioserver.log',
  },
  dbConfig: {
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: process.env.DATABASE_PASSWORD,
    database: 'interference',
  },
  bcrypt: {
    saltRounds: 10,
  },
  authToken: {
    jwtSecretKey: process.env.JWT_SECRET_KEY,
    tokenExpires: '7d',
    tokenRefresh: 3600 * 1000,
  },
  authCookie: {
    cookieExpires: 7 * 24 * 60 * 60 * 1000, // 7 days in
  },
  corsOptions: {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: 'http://localhost:3000',
    credentials: true,
  },
  upload: {
    uploadFileDir: '/Users/wmodes/dev/interference/uploads',
    tmpFileDir: '/Users/wmodes/dev/interference/uploads/tmp',
  },
  audio: {
    classification: [
      'Ambient', 
      'Atmospheric', 
      'Environmental', 
      'Premixed', 
      'Soundscape', 
      'Archival', 
      'Spoken', 
      'Narrative', 
      'Instructional', 
      'Vocal', 
      'Instrumental', 
      'Experimental', 
      'Digital', 
      'Effect',
      'Other'
    ],
  },
  recipes: {
    classification: [
      'Ambient', 
      'Atmospheric', 
      'Environmental', 
      'Premixed', 
      'Soundscape', 
      'Archival', 
      'Spoken', 
      'Narrative', 
      'Instructional', 
      'Vocal', 
      'Instrumental', 
      'Experimental', 
      'Digital', 
      'Other'
    ],
    length: {   // in seconds
      veryShort: {
        // 0 to 10 seconds - most sound effects
        min: 0,
        max: 10,
      },
      short: {
        // 10 seconds to 2 minutes - most sound effects and some music
        min: 10,
        max: 60 * 2,
      },
      medium: { 
        // 2 minutes to 5 minutes - most music
        min: 60 * 2,
        max: 60 * 5,
      },
      long: {
        // 5 minutes to 10 minutes - longer music and some soundscapes
        min: 60 * 5,
        max: 60 * 10,
      },
      veryLong: {
        // 10 minutes to 60 minutes - long soundscapes, environmental recordings, and ambient
        min: 60 * 10,
        max: 60 * 60,
      },
    },  
  },
  mixes: {
    maxRecent: 12,
    maxQueued: 12,
  }
};