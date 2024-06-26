// audioRoutes.js - This file contains the routes for audio file upload and management.
// List of routes:
//   /api/audio/upload - Route to upload audio file
//   /api/audio/info - Route to fetch audio info
//   /api/audio/list - Route to list audio files
//   /api/audio/update - Route to update audio information
//   /api/audio/trash - Route to trash an audio file

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'debug');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// audio and file management imports
const multer = require('multer');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const path = require('path');
const { mkdirp } = require('mkdirp');

// configuration import
const { config } = require('config');

// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const contentFileDir = config.content.contentFileDir;
const tmpFileDir = config.content.tmpFileDir;

// Multer configuration for temporary upload
const upload = multer({ dest: tmpFileDir });


//
// AUDIO FETCHING AND LISTING
//
//

// Route to list audio files
//
router.post('/list', verifyToken, async (req, res) => {
  try {
    logger.debug(`audioRoutes:/list: req.body: ${JSON.stringify(req.body, null, 2)}`);

    // Construct sort and filter parameters
    const sort = req.body.sort || 'date';
    const order = req.body.order === 'ASC' ? 'ASC' : 'DESC';
    const filter = req.body.filter;
    const targetID = req.body.targetID || req.user.userID;
    const page = req.body.page || 1;
    const recordsPerPage = req.body.recordsPerPage || 15;
    const offset = (page - 1) * recordsPerPage;

    // Determine sort column from provided sort parameter
    const sortOptions = {
      id: 'audioID',
      title: 'title',
      status: 'status',
      author: 'creatorID', 
      date: 'createDate',
    };
    const sortColumn = sortOptions[sort.toLowerCase()] || 'createDate';

    // Define filter options
    const filterOptions = {
      all : {
        query: 'AND a.status != ?', 
        values: ['Trashed']
      },
      user: {
        query: 'AND a.creatorID = ? AND a.status != ?',
        values: [targetID, 'Trashed'] 
      },
      trash: {
        query: 'AND a.status = ?',
        values: ['Trashed']
      },
      review: {
        query: 'AND a.status = ?',
        values: ['Review']
      },
      approved: {
        query: 'AND a.status = ?',
        values: ['Approved']
      },
      disapproved: {
        query: 'AND a.status = ?',
        values: ['Disapproved']
      }
    };
    // Determine filter condition from provided filter parameter
    let filterCondition = filterOptions[filter] || filterOptions['all'];
    let filterQuery = filterCondition.query;
    let filterValues = filterCondition.values;

    // construct query and value strings
    const queryStr1 = `
      SELECT
        COUNT(*) AS totalRecords
      FROM audio a
      WHERE 1=1 ${filterQuery};
    `;
    const queryValues1 = filterValues;
    logger.debug(`audioRoutes:/list: queryStr1: ${queryStr1}, queryValues1: ${JSON.stringify(queryValues1)}`);

    // Execute countQuery to get the total number of records
    const [countResult] = await db.query(queryStr1, queryValues1);
    
    const totalRecords = countResult[0].totalRecords;

    // Get the audio list with filter, sort, and pagination
    // Construct the query string
    const queryStr2 = `
      SELECT
        a.*,
        u1.username AS creatorUsername,
        u2.username AS editorUsername
      FROM audio a
      LEFT JOIN users u1 ON a.creatorID = u1.userID
      LEFT JOIN users u2 ON a.editorID = u2.userID
      WHERE 1=1 ${filterQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?;
    `;
    const queryValues2 = [...filterValues, recordsPerPage, offset];
    logger.debug(`audioRoutes:/list: queryStr2: ${queryStr2}, queryValues2: ${JSON.stringify(queryValues2)}`);

    // Execute the query
    const [audioList] = await db.query(queryStr2, queryValues2);

    // Respond with the fetched data
    res.status(200).json({
      totalRecords,
      audioList,
    });
  } catch (error) {
    logger.error(`audioRoutes:/list: Error listing audio files: ${error}`);
    res.status(500).send('Server error during audio list retrieval');
  }
});

// Route to fetch audio info
//
router.post('/info', verifyToken, async (req, res) => {
  const { audioID } = req.body;
  if (!audioID) {
    return res.status(400).send('Audio ID is required');
  }
  try {
    // Verify token and get userID (optional for this route, depending on your security model)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    // You might not need the userID here unless you're checking if the user has the right to view this audio's info

    // Construct query to fetch audio info from the database 
    const query = `
    SELECT 
      audio.*, 
      creator.username AS creatorUsername,
      editor.username AS editorUsername 
    FROM audio
    JOIN users AS creator ON audio.creatorID = creator.userID
    LEFT JOIN users AS editor ON audio.editorID = editor.userID
    WHERE audio.audioID = ?;`;
    const values = [audioID];

    const [result] = await db.query(query, values);
    if (result.length === 0) {
      return res.status(404).send('Audio not found');
    }
    // Repair broken JSON fields
    record = result[0];
    record.classification = repairBrokenJSON(record.classification);
    record.tags = repairBrokenJSON(record.tags);
    res.status(200).json(record);
  } catch (error) {
    logger.error(`audioRoutes:/info: Error verifying token or fetching audio info: ${error}`);
    res.status(500).send('Server error during audio info retrieval');
  }
});

// Route to fetch audio file
//
router.get('/sample/:year/:month/:filename', verifyToken, async (req, res) => {
  // Extract parameters from the request
  const { year, month, filename } = req.params;

  // Construct the file path
  // Adjust the path according to your actual files location
  const filePath = path.join(contentFileDir, year, month, filename);
  logger.debug(`audioRoutes:renameAndStore: filePath: ${filePath}`);

  try {
    await fs.access(filePath, fs.constants.F_OK);
    // File exists, proceed to send it
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`audioRoutes:/sample: Error sending file: ${err}`);
        if (!res.headersSent) {
          res.status(500).send('Error serving the file');
        } else {
          logger.error('audioRoutes:/sample: Response was already partially sent when error occurred');
        }
      }
    });
  } catch (err) {
    logger.error(`audioRoutes:/sample: File does not exist: ${filePath}`);
    if (!res.headersSent) {
      res.status(404).send('File not found');
    } else {
      logger.error('audioRoutes:/sample: Response was already partially sent when file not found error occurred');
    }
  }
});

//
// UPLOADING AUDIO
//

// Route to create an audio element including uploading the file
//
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  record = req.body;
  logger.debug(`audioUpload Route: record: ${JSON.stringify(record, null, 2)}`);
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    logger.debug(`audioRoutes:/upload: origfilename: ${req.file.originalname}`);
    // Verify token and get userID (sync)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const creatorID = decoded.userID;
    logger.debug(`audioRoutes:/upload: creatorID: ${creatorID}`);
    // Rename file and move into place (async)
    const filePathForDB = await renameAndStore(req.file.path, req.file.originalname, record.title);
    const fullFilePath = path.join(contentFileDir, filePathForDB);
    logger.debug(`audioRoutes:/upload: fullFilePath: ${fullFilePath}, filePathForDB: ${filePathForDB}`);
    // Get audio duration (async)
    const duration = await getAudioDuration(fullFilePath);
    logger.debug(`audioRoutes:/upload: duration: ${duration}`);
    // Get file type from file name in lowercase (sync)
    const filetype = path.extname(req.file.originalname).toLowerCase().substring(1);
    logger.debug(`audioRoutes:/upload: filetype: ${filetype}`);

    // Prep db params
    const query = `INSERT INTO audio (title, status, filename, creatorID, duration, filetype, classification, tags, comments, copyrightCert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      record.title, 
      record.status,
      filePathForDB, 
      creatorID, 
      duration, 
      filetype, 
      record.classification, 
      JSON.stringify(normalizeTagArray(record.tags)), 
      record.comments, 
      record.copyrightCert
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    const audioID = result.insertId;
    res.status(200).send({
      message: 'File uploaded successfully',
      filepath: filePathForDB,
      audioID: audioID
    });
  } catch (error) {
    logger.error(`audioRoutes:/upload: Error processing upload: ${error}`);
    res.status(500).send('Server error during file processing');
  }
});

//
// UPDATING AUDIO
//

// Route to update audio information
//
router.post('/update', verifyToken, async (req, res) => {
  const record = req.body;
  logger.debug(`audioURoutes:/update record: ${JSON.stringify(record, null, 2)}`);
  const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
  const editorID = decoded.userID;

  const { audioID, title, status, classification, tags, comments } = req.body;
  
  if (!record.audioID) {
    return res.status(400).send('Audio ID is required for update.');
  }
  
  try {
    const query = `UPDATE audio SET
        title = ?,
        editorID = ?,
        editDate = NOW(),
        status = ?,
        classification = ?,
        tags = ?,
        comments = ?
      WHERE audioID = ?`;
    const values = [
      record.title,
      editorID,
      record.status,
      JSON.stringify(record.classification),
      JSON.stringify(normalizeTagArray(record.tags)),
      record.comments,
      record.audioID
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      // This means the audio ID was not found or no fields were changed.
      return res.status(404).send('Audio not found or no update was made');
    }
    res.status(200).send({ message: 'Audio updated successfully' });
  } catch (error) {
    logger.error(`audioRoutes:/update: Server error during audio update: ${error}`);
    res.status(500).send('Server error');
  }
});

// Route to trash an audio file
//
router.post('/trash', verifyToken, async (req, res) => {
  const audioID = req.body.audioID;
  if (!audioID) {
    return res.status(400).send('Audio ID is required');
  }
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;
    // construct query and values
    const query = `UPDATE audio SET status = 'Trashed' WHERE audioID = ?`;
    const values = [audioID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Audio not found');
    }
    res.status(200).send({ message: 'Audio trashed successfully' });    
  } catch (error) {
    logger.error(`audioRoutes:/trash: Error trashing audio file: ${error}`);
    res.status(500).send('Server error during audio trashing');
  }
});

//
// HELPERS
//

// Renames the file and moves it to the final upload directory
async function renameAndStore(tempPath, origFilename, title) {

  // get date info for the directory structure
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // create the directory if it doesn't exist
  const uploadDir = path.join(contentFileDir, year, month);
  logger.debug(`audioRoutes:renameAndStore: uploadDir: ${uploadDir}`);
  await mkdirp(uploadDir);

  // Normalize the title to be used as the filename
  let baseFilename = title.toLowerCase().replace(/[\W_]+/g, '-').replace(/^\-+|\-+$/g, '');
  logger.debug(`audioRoutes:renameAndStore: baseFilename: ${baseFilename}`);

  // Extract the extension from the original filename
  const extension = path.extname(origFilename).toLowerCase();
  logger.debug(`audioRoutes:renameAndStore: extension: ${extension}`);

  // Place the file in the final directory
  //
  // Initialize the counter and construct the initial fullFilepath
  // Base case: if the file doesn't alraedy exist, ex: 2024/03/eavesdropping.mp3
  let counter = 0;
  let filename = `${baseFilename}${extension}`;
  let fullFilepath = path.join(uploadDir, filename);

  // Loop until a unique filename is found without overwriting existing files
  // Collision-case: if file exists, append a number, ex: 2024/03/eavesdropping-14.mp3
  while (await fsExtra.pathExists(fullFilepath)) {
    counter++;
    filename = `${baseFilename}-${counter}${extension}`;
    fullFilepath = path.join(uploadDir, filename);
  }

  // Move the file to the final path without overwriting
  await fsExtra.move(tempPath, fullFilepath, { overwrite: false });
  logger.debug(`audioRoutes:renameAndStore: fullFilepath: ${fullFilepath}`);
  
  // Calculate the relative path without hardcoding
  const relativePath = path.relative(path.join(contentFileDir), fullFilepath);
  logger.debug(`audioRoutes:renameAndStore: relativePath: ${relativePath}`);

  return relativePath;
}

// Get the duration of an audio file in seconds using the get-audio-duration module
const getAudioDuration = (filePath) => {
  return getAudioDurationInSeconds(filePath);
};

// Normalizes a string of tags
const normalizeTagArray = (tagsArray) => {
  if (!tagsArray) return [];
  // if tagsArray is a string, convert it to an array
  if (typeof tagsArray === 'string') {
    tagsArray = JSON.parse(tagsArray);
  }
  // Split the string into an array by commas, then process each tag
  return tagsArray.map(tag =>
      // Convert to lowercase, trim whitespace, and then replace special characters and spaces with dashes
      // Finally, trim any leading or trailing dashes that might have been added
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index)
};

const repairBrokenJSON = (jsonField) => {
  if (typeof jsonField === 'string') {
    return [];
  }
  return jsonField;
};

module.exports = router;