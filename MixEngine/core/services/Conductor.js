/**
 * @file Conductor.js - Main orchestrator for managing recipe selection and other tasks
 */

const { database: db } = require('config');
const logger = require('config/logger').custom('Conductor', 'info');
const JSON5 = require('json5');
const RecipeSelector = require('@services/recipes/RecipeSelector');
const RecipeParser = require('@services/recipes/RecipeParser');
const ClipSelector = require('@services/clips/ClipSelector');
const ClipAdjustor = require('@services/clips/ClipAdjustor');
const MixEngine = require('@services/audio/MixEngine');
const MixQueue = require('@services/queue/MixQueue');

const { config } = require('config');
const maxQueued = config.mixes.maxQueued;
const checkTime = config.mixes.checkTime;

/**
 * Class representing the Conductor.
 */
class Conductor {
  constructor() {
    this.recipeSelector = new RecipeSelector();
    this.recipeParser = new RecipeParser();
    this.clipSelector = new ClipSelector(); 
    this.clipAdjustor = new ClipAdjustor();
    this.mixEngine = new MixEngine();
    this.mixQueue = new MixQueue();
    // this.playlist = [];
  }

  /**
   * Starts the conductor's main loop.
   * @async
   */
  async start() {
    while (true) {
      try {
        const numberMixesInQueue = await this.mixQueue.getNumberOfMixesInQueue();
        logger.debug(`Number of mixes in queue: ${numberMixesInQueue}`);
        if (numberMixesInQueue <= maxQueued) {
          //
          // Place to store mix details
          const mixDetails = {};
          //
          // Select a fresh new recipe
          const selectedRecipe = await this.recipeSelector.getNextRecipe();
          logger.info(`Selected Recipe: ${selectedRecipe.title}`);
          //
          // Validate the recipe
          if (!this.recipeParser.validateRecipe(selectedRecipe)) {
            logger.error(`Validation failed: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
            // start new loop iteration
            continue;
          }
          // console.log('typeof selectedRecipe.recipeData:', typeof selectedRecipe.recipeData);
          // console.log('Selected Recipe:', JSON5.stringify(selectedRecipe.recipeData, null, 2));
          //
          // Normalize the recipe
          // this.testRecipeNormalize()
          this.recipeParser.normalizeRecipe(selectedRecipe);
          //
          // Mark the mix length track
          this.recipeParser.markMixLengthTrack(selectedRecipe);
          //
          // Set tags for clip selection
          this.clipSelector.resetTags();
          const trackTags = this.recipeParser.getTagsFromTracks(selectedRecipe);
          this.clipSelector.addTags(trackTags);
          // Select files based on clips as criteria
          const clipResults = await this.clipSelector.selectAudioClips(selectedRecipe);
          logger.debug(`recipe after clip selection: ${JSON5.stringify(selectedRecipe.recipeObj, null, 2)}`);
          //
          // Did we find clips for this recipe?
          if (!clipResults) {
            logger.error(`Clips not found for recipe: ${selectedRecipe.title} (${selectedRecipe.recipeID})`);
            // start new loop iteration and get new recipe
            continue;
          }
          //
          // Get list of clips for playlist
          mixDetails.playlist = this.recipeParser.getPlaylistFromRecipe(selectedRecipe) || [];
          logger.debug(`Conductor:start: playlist: ${JSON5.stringify(mixDetails.playlist, null, 2)}`);
          //
          // Adjust timings for clips
          mixDetails.duration = this.clipAdjustor.adjustClipTimings(selectedRecipe);
          logger.debug(`recipe after clip timing adjustment: ${JSON5.stringify(selectedRecipe.recipeObj, null, 2)}`);
          //
          // Get next mix ID
          mixDetails.mixID = await this.mixQueue.getNextMixID();
          //
          // Make the mix
          await this.mixEngine.makeMix(selectedRecipe, mixDetails);
          logger.debug(`Conductor:start: mixDetails: ${JSON5.stringify(mixDetails, null, 2)}`);
          //
          // Create entry into the database for the mix
          await this.mixQueue.createMixQueueEntry(selectedRecipe, mixDetails);
          //
          // Prune old mixes
          await this.mixQueue.pruneMixes();
        } 
        // We already have a maxed out queue, let's wait a bit
        else {
          //wait for some time or check for a condition to continue
          await this.waitForNextIteration(); // Placeholder for timing logic
        }
      } catch (error) {
        logger.error(new Error(`Conductor error: ${error.message}, ${error.stack}`));
        //wait for some time or check for a condition to continue
        await this.waitForNextIteration(); // Placeholder for timing logic
      }
    }
  }

  /**
   * Waits for the next iteration when the queue is maxed out.
   * @async
   */
  async waitForNextIteration() {
    logger.info('Conductor:waitForNextIteration: Queue Maxed Out, Waiting...');
    return new Promise(resolve => setTimeout(resolve, checkTime));
  }

  // Add any additional methods needed for your application logic
}

module.exports = Conductor;
