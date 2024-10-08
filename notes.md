# DriftCondition Technical Notes

Here are critical or useful technical notes (largely for myself since I forget this stufff if I don't write it down).

## Port Management

### Local/dev

- https://localhost:3000 - React build of AdminClient 
- http://localhost:3001 - Dev version of AdminClient
- https://localhost:8080 - Secure reverse proxy to AdminServer
- http://localhost:8081 - AdminServer
- https://localhost:8082 - Secure reverse proxy to MixEngine
- http://localhost:8083 - MixEngine
- mysql://localhost:3306 - MySQL server
- https://localhost:8000 - Icecast secure stream
- http://localhost:8001 - Icecast stream (stream source & listener)

### Server

- http://driftconditions.org:80 - redirects to https on port 443
- https://driftconditions.org:443 - React build of AdminClient
- https://driftconditions.org:8080 - Secure reverse proxy to AdminServer (ufw limited)
- http://driftconditions.org:8081 - AdminServer (ufw limited)
- https://driftconditions.org:8082 - Secure reverse proxy to MixEngine (ufw limited)
- http://driftconditions.org:8083 - MixEngine (ufw limited)
- mysql://driftconditions.org:3306 - MySQL server (ufw limited)
- https://driftconditions.org:8000 - Icecast secure stream (ufw limited)
- http://driftconditions.org:8001 - Icecast stream (stream source & listener - ufw blocked)

## Scripts

- scripts/rebuild-client.sh - rebuild AdminClient
- scripts/restart.sh - restart all servers (except mysql which never needs it)

## Start Up

Note that on the server, systemctl takes care of startup upon boot. I did development on MacOS and production on a Debian server and these instructions reflect that. Your mileage may vary.

### Local Live Testing (without building)

Start the mysql server (probably already running):
```
% brew services start mysql
```

Start AdminServer in its own terminal:
```
% cd AdminServer
% npm start
```

Start MixEngine in its own terminal:
```
% cd MixEngine
% npm start
```

Start AdminClient in its own terminal:
```
% cd AdminServer
% npm start
```

Start reverse proxies for AdminServer and MixEngine in its own terminal:
```
% cd interference
% sudo caddy run --config setupfiles/Caddyfile.local
```
Access client at http://localhost:3001

Start liquidsoap in its own terminal:
```
% cd interference
% liquidsoap setupfiles/liquidsoap.liq
```

Start Icecast server with:
```
% icecast -c /usr/local/etc/icecast.xml
```

### Local build testing

Start AdminServer in its own terminal:
```
% cd AdminServer
% npm start
```

Start MixEngine in its own terminal:
```
% cd MixEngine
% npm start
```

Start Caddy including AdminClient build along with the reverse proxies in its own terminal:
```
% cd interference
% sudo caddy run --config setupfiles/Caddyfile.local
```
Access client at https://localhost:3000

Start Icecast server with:
```
% icecast -c /usr/local/etc/icecast.xml
```

Start liquidsoap in its own terminal:
```
% cd interference
% liquidsoap setupfiles/liquidsoap.liq
```

### Server build testing

Start/restart AdminServer (one or the other, depending):
```
% sudo systemctl start adminserver.service
% sudo systemctl restart adminserver.service
```

Start/restart MixEngine (one or the other, depending):
```
% sudo systemctl start mixengine.service
% sudo systemctl restart mixengine.service
```

Start/restart Caddy including AdminClient build along with the reverse proxies:
```
% sudo systemctl start caddy
% sudo systemctl restart caddy
```

Start/restart Icecast:
```
sudo systemctl start icecast2
sudo systemctl restart icecast2
```

Start/restart liquidsoap:
```
% sudo systemctl start liquidsoap.service
% sudo systemctl restart liquidsoap.service
```

## Technologies

Here is a list of technologies we are relying on:

### AdminServer:

- **Node.js**: Used as the runtime environment for the server.
- **Express**: Framework for handling server-side logic.
  - **body-parser**: Middleware to parse incoming request bodies.
  - **cookie-parser**: Middleware to parse cookies attached to the client request object.
  - **cors**: Middleware to enable CORS (Cross-Origin Resource Sharing).
  - **express-sslify**: Middleware to enforce SSL in your Node.js Express apps.
- **MySQL**: Database system used for data storage.
- **bcrypt**: Library to help you hash passwords.
- **bcrypt-promise**: Promisified version of bcrypt for use with async/await.
- **jsonwebtoken**: Implementation of JSON Web Tokens for authentication.
- **config**: Configuration management for Node.js.
- **ffprobe-static** & **fluent-ffmpeg**: Tools for working with audio and video formats.
- **fs-extra**: Extension of the standard `fs` module with extra file system methods.
- **get-audio-duration**: Module to determine the duration of audio files.
- **mkdirp**: Utility to create directories with a given path.
- **multer**: Middleware for handling `multipart/form-data`, primarily used for uploading files.

### AdminClient:

- **React**: A JavaScript library for building user interfaces.
  - **axios**: Promise-based HTTP client for making requests to external services.
  - **react-router-dom**: DOM bindings for React Router; manages navigation and rendering of components in React applications.
  - **@reduxjs/toolkit**: Toolset for efficient Redux development.
  - **react-redux**: Official React bindings for Redux.
  - **react-ace**: React component for Ace editor.
  - **react-dom**: React package for working with the DOM.
  - **react-scripts**: Configuration and scripts for Create React App.
- **TailwindCSS**: A utility-first CSS framework for rapidly building custom designs.
- **Babel**: JavaScript compiler that lets you use next generation JavaScript, today.
- **Prettier**: An opinionated code formatter.
- **Various utilities**:
  - **ldrs**: Custom library/package.
  - **tracery-grammar**: Library to generate text based on a grammar specification.
  - **wavesurfer.js**: Interactive navigable audio visualization using Web Audio and Canvas.
- **Development tools**:
  - **eslint**: Linter tool to standardize code quality.
  - **feather-icons-react**: React component for Feather icons.
  - **react-tag-input**: Component to handle tag inputs in React.
  - **crypto**, **os**, **path**: Node.js libraries for cryptographic functions, operating system related utility methods, and working with file and directory paths.

### MixEngine:

- **Node.js**: Used as the runtime environment for the server.
- **Express**: Web application framework for Node.js.
  - **cookie-parser**: Middleware to parse cookies attached to the client request object.
  - **cors**: Package to enable CORS (Cross-Origin Resource Sharing).
- **ffmpeg**:
  - **fluent-ffmpeg**: A fluent API to interact with FFmpeg.
  - **ffprobe-static**: Provides static binaries for FFprobe.
- **Filesystem**:
  - **fs-extra**: Extra methods for the fs object in Node.js like copy, remove, mkdirs.
- **JSON**:
  - **json5**: JSON for humans (enhanced version of JSON with additional syntax for ease of use).
- **Security**:
  - **jsonwebtoken**: Implementation of JSON Web Tokens to transmit information between parties as a JSON object securely.
- **Configuration**:
  - **config**: Local module linked from another location, managing configurations.
- **Module Aliasing**:
  - **module-alias**: Simplifies module resolution by providing aliases.
- **Development and Code Quality Tools**:
  - **eslint**: Linting utility for JavaScript and JSX, with plugins for standards and promises.
  - **globals**: Provides global variables for linting environments.

### Local Configuration Module (`config`):

- **Node.js**: Used as the runtime environment for the configuration settings.
- **dotenv**: Loads environment variables from a `.env` file into `process.env`.
- **mysql2**: MySQL client for Node.js with focus on performance. Supports prepared statements, non-blocking API, connection pooling, and more.
- **winston**: A logger for just about everything in Node.js.

This module is essential for managing the settings and configurations that dictate how the application behaves in different environments, and it abstracts away the complexities of environment-specific configurations.

## Generalized Noise Equation for ffmpeg

Here 'noise' refers to coherent noise filters, a harmonic series based on sine and cosine general harmonic sumation filter:

```
min(1, max(0, ((
    cos(PI * t * fs / f0 + fo) * a0 + 
    cos(PI * t * fs / f1 + fo) * a1 + 
    cos(PI * t * fs / f2 + fo) * a2) + ao ) * as  * po + q))
```

where:

* **[f0, f1, f2]** designate increasingly finer frequencies, default [17, 7, 3]
* **[a0, a1, a2]** scale the wave to decreased amplidtude, default [1, 0.5, 0.25]
* **fs** is a general frequency scaler, default 0.25, an nice large period
* **fo** is a general frequency offset, default 0, to create different period offsets
* **as** is a general amplitude scaler, default 0.75, creates a 3/4 height wave
* **ao** is a general amplitude offset, default 0.5, offset 1/2 from 0
* **po** is polarity [-1, 1], default 1, used to create an inverse wave
* **q** offsets the entire wave, default 0.5, centered at 1/2

## Streaming services

FastCast4u
128kbps: $18.75 per month / $149.25 per year / $224.25 per 2 years
Stream address:
https://usa14.fastcast4u.com/proxy/wmodes?mp=/1
