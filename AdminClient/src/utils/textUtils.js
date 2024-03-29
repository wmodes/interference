// Description: Text utility functions
//  - generating random texts
//  - choosing a project name

//
// Generating random texts
//

var tracery = require('tracery-grammar');

var grammarDefinition = {
    "origin": [
        "#assertion#"
    ],
    "intro": [
      "%projectName% is an online radio station that captures #evocativeNounPhrase# in #evocativeNounPhrase#."
    ],
    "assertion": [
        "#thingsWeWillFind.capitalize#, #thingsWeWillFind#, and #thingsWeWillFind# weave #thingsWeWillFind# that draws listeners into #evocativeNounPhrase#.",
        "Inspired by the unpredictability of real-world radio broadcast, %projectName% explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on #evocativeNounPhrase#.",
        "With each new listening experience, %projectName% offers #evocativeNounPhrase#.",
        "%projectName% whispers its tales as secrets shared under the cloak of night, #evocativeNounPhrase#.",
        "It's told not with the clarity of daylight but with the mystery of shadows, where sounds blend and tales intertwine like conversations on a long, late-night journey with a close companion.",
        "Stories come through in #thingsWeWillFind#, #thingsWeWillFind#, #thingsWeWillFind#, #thingsWeWillFind#.",
        "%projectName% invites you to lean closer, to become part of #evocativeNounPhrase#, #evocativeNounPhrase#, all wrapped in #evocativeNounPhrase#.",
        "%projectName% blends #evocativeNounPhrase# with #evocativeNounPhrase#, crafting #evocativeNounPhrase#.",
        "This online audio experience weaves #evocativeNounPhrase#, drawing listeners into #evocativeNounPhrase#.",
        "Each session offers #evocativeNounPhrase#, exploring #evocativeNounPhrase#.",
        "#thingsWeWillFind#, #thingsWeWillFind#, and #thingsWeWillFind# weave #thingsWeWillFind# that draws listeners into #evocativeNounPhrase#.",
        "Inspired by the unpredictability of real-world radio interference, %projectName% explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on #evocativeNounPhrase#.",
        "With each new listening session, %projectName% offers #evocativeNounPhrase#."
    ],
    "thingsWeWillFind": [
        "overlapping fragmented stories",
        "a distorted broadcast",
        "a larger narrative",
        "ambient sounds",
        "fragmented pieces",
        "mysterious crosstalk",
        "an overheard conversation",
        "a vivid sonic collage",
        "interwoven narratives",
        "a disjointed transmission",
        "an unfolding tableau",
        "whispers in the static",
        "a tapestry of echoes",
        "echoes of lost voices",
        "a mosaic of memories",
        "shadows of untold stories",
        "a symphony of dissonance",
        "veiled whispers"        
    ],
    "plainENP": [
        "a fresh journey through its evocative auditory landscape",
        "a hidden world of voices and atmospheres unconstrained by traditional narrative structures",
        "a tapestry of serendipitous encounters",
        "a unique journey through its evocative soundscape",
        "a world where intention and chance converge",
        "a realm beyond traditional narratives",
        "an immersive and unpredictable listening experience",
        "an immersive stream of stories, sounds, and crosstalk",
        "an intimate exchange between the listener and the vast, unseen world",
        "an unfolding mystery",
        "the creativity of code-generated audio",
        "the chaos and serendipity of late-night radio tuning",
        "the liminality of an endless night drive",
        "the unpredictability of late-night radio",
        "the warmth of voice and the chill of the unknown",
        "an uncanny audio stream generated on the fly by code"
    ],
    "evocativeNounPhrase": [
      "#plainENP#", "<b>#plainENP#</b>"
    ]
}

var grammar = tracery.createGrammar(grammarDefinition);
grammar.addModifiers(tracery.baseEngModifiers);

export const generateRandomTexts = (projectName) => {
  let texts = [];
  let shortestIndex = 1; // Start considering from the second element
  let shortestLength = Infinity; // Initialize with a very large number

  // Make sure your grammar uses the projectName properly
  // Intro phrase
  texts.push(grammar.flatten('#intro#').replace(/%projectName%/g, projectName));

  for (let i = 0; i < 6; i++) {
      let text = grammar.flatten('#origin#').replace(/%projectName%/g, projectName);
      // Capitalize the first character and concatenate the rest of the string
      text = text.charAt(0).toUpperCase() + text.slice(1);
      texts.push(text);

      // Skip the first element for shortest check, start from the second
      if (i >= 1 && text.length < shortestLength) {
          shortestLength = text.length;
          shortestIndex = i + 1; // Adjust index because of the initial intro phrase
      }
  }

  // Move the shortest text to the second position if it's not already there
  // Ensure the shortest text is not the intro phrase itself
  if (shortestIndex > 1 && shortestIndex !== 2) {
      const [shortestText] = texts.splice(shortestIndex, 1); // Remove the shortest text
      texts.splice(2, 0, shortestText); // Insert at the second position
  }
  return texts;
};

//
// Choosing a project name
//

const projectNames = [
  "Static Drift",
  "Radio Chatter",
  "Radio Nocturne",
  "Whiskey Murmur",
  "Toxic Event",
  "Drift Condition",
  "Radio Interference",
  "Dusk Variations",
  "Drift Frequency",
  "Radio Halcyon",
  "Radio Mirage",
  "Radio Elegy",
  "Radio Diaspora",
  "Project Aether",
];

export const getProjectName = () => {
  let projectName = sessionStorage.getItem('projectName');
  if (!projectName) {
    projectName = projectNames[Math.floor(Math.random() * projectNames.length)];
    sessionStorage.setItem('projectName', projectName);
  }
  return projectName;
};
