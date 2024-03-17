// recipeRoutes.js - This file contains the routes for recipe management.

const express = require('express');
const router = express.Router();
const db = require('../database');

const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

const config = require('../config');
const jwtSecretKey = config.authToken.jwtSecretKey;

// Route to create a new recipe
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { title, description, recipe_data, status, classification, tags, comments } = req.body;
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const creator_id = decoded.userID;

    // massage incoming data
    const tagsJSON = JSON.stringify(normalizeTags(tags));
    const classificationJSON = JSON.stringify(classification);
    const recipeDataJSON = JSON.stringify(recipe_data);

    const query = `INSERT INTO recipes (title, creator_id, description, recipe_data, status, classification, tags, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [title, creator_id, description, recipeDataJSON, status, classificationJSON, tagsJSON, comments];
    const [result] = await db.query(query, values);
    const recipeID = result.insertId;
    res.status(200).json({
      message: 'Recipe created successfully',
      recipeID: recipeID
    });
  } catch (error) {
    console.error('Error creating new recipe:', error);
    res.status(500).send('Server error during recipe creation');
  }
});

// Route to fetch recipe info
router.post('/info', verifyToken, async (req, res) => {
  const { recipeID } = req.body;
  if (!recipeID) {
    return res.status(400).send('Recipe ID is required');
  }
  try {
    const query = `SELECT * FROM recipes WHERE recipe_id = ?`;
    const values = [recipeID];
    const [result] = await db.query(query, values);
    if (result.length === 0) {
      return res.status(404).send('Recipe not found');
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error fetching recipe info:', error);
    res.status(500).send('Server error during recipe info retrieval');
  }
});

// Route to list recipes
router.post('/list', verifyToken, async (req, res) => {
  try {
    const sort = req.body.sort || 'date';
    const order = req.body.order === 'ASC' ? 'ASC' : 'DESC';
    const filter = req.body.filter || 'all';
    const targetID = req.body.targetID || req.user.userID;
    const page = parseInt(req.body.page || 1, 10);
    const recordsPerPage = parseInt(req.body.recordsPerPage || 20, 10);
    const offset = (page - 1) * recordsPerPage;

    const sortOptions = {
      id: 'recipe_id',
      title: 'LOWER(title)',
      status: 'LOWER(status)',
      author: 'creator_id', 
      date: 'create_date',
    };
    const sortColumn = sortOptions[sort] || 'create_date';

    // Define filter options
    const filterOptions = {
      all : {
        query: 'AND a.status != ?', 
        values: ['Trashed']
      },
      user: {
        query: 'AND a.creator_id = ? AND a.status != ?',
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

    // Execute countQuery to get the total number of records
    const [countResult] = await db.query(`
      SELECT COUNT(*) AS totalRecords
      FROM recipes a
      WHERE 1=1 ${filterQuery};
    `, filterValues);
    
    const totalRecords = countResult[0].totalRecords;

    // Get the audio list with filter, sort, and pagination
    const [recipeList] = await db.query(`
      SELECT 
        a.*,
        u1.username AS creator_username,
        u2.username AS editor_username
      FROM recipes a
      LEFT JOIN users u1 ON a.creator_id = u1.user_id
      LEFT JOIN users u2 ON a.editor_id = u2.user_id
      WHERE 1=1 ${filterQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?;
    `, [...filterValues, recordsPerPage, offset]);

    // Respond with the fetched data
    res.status(200).json({
      totalRecords,
      recipeList,
    });
  } catch (error) {
    console.error('Error listing recipes:', error);
    res.status(500).send('Server error during recipe list retrieval');
  }
});

// Route to update recipe information
router.post('/update', verifyToken, async (req, res) => {
  const { recipeID, title, description, recipe_data, status, classification, tags, comments } = req.body;
  if (!recipeID) {
    return res.status(400).send('Recipe ID is required for update.');
  }

  // massage incoming data
  const tagsJSON = JSON.stringify(normalizeTags(tags));
  const classificationJSON = JSON.stringify(classification);
  const recipeDataJSON = JSON.stringify(recipe_data);

  try {
    const query = `UPDATE recipes SET
      title = ?,
      description = ?,
      recipe_data = ?,
      status = ?,
      classification = ?,
      tags = ?,
      comments = ?
    WHERE recipe_id = ?`;
    const values = [title, description, recipeDataJSON, status, classificationJSON, tagsJSON, comments, recipeID];

    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Recipe not found or no update was made');
    }
    res.status(200).json({ message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Server error during recipe update:', error);
    res.status(500).send('Server error');
  }
});

// Route to delete (trash) a recipe
router.post('/delete', verifyToken, async (req, res) => {
  const { recipeID } = req.body;
  if (!recipeID) {
    return res.status(400).send('Recipe ID is required');
  }
  try {
    const query = `DELETE FROM recipes WHERE recipe_id = ?`;
    const values = [recipeID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Recipe not found');
    }
    res.status(200).json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).send('Server error during recipe deletion');
  }
});

//
// HELPERS
//

// Normalizes a string of tags
const normalizeTags = (tagsString) => {
  // Split the string into an array by commas, then process each tag
  const tagsArray = tagsString.split(',')
    .map(tag =>
      // Convert to lowercase, trim whitespace, and then replace special characters and spaces with dashes
      // Finally, trim any leading or trailing dashes that might have been added
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);

  // Return the processed tags as an array
  return tagsArray;
};

module.exports = router;