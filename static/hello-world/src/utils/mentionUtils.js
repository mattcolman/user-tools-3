/**
 * Utility functions for handling @mentions in text
 */

/**
 * Finds all @mentions in the given text
 * @param {string} text - The text to search for mentions
 * @returns {string[]} Array of mentioned usernames (without the @ symbol)
 */
export const findMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Simple approach: match @username where username stops at whitespace or punctuation
  // but allow spaces within names by looking for common word boundaries
  const mentionRegex = /(?<!\w)@([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)*?)(?=\s|[^\w\s.-]|$)/g;
  const matches = [...text.matchAll(mentionRegex)];
  
  return matches.map(match => {
    let username = match[1];
    // Clean up common trailing words that shouldn't be part of the username
    username = username.replace(/\s+(and|or|the|a|an|in|on|at|to|for|with|by|from|about|into|through|during|before|after|above|below|up|down|out|off|over|under|again|further|then|once|said|replied|agreed|please|review|this|tomorrow|are|here|is|great).*$/i, '');
    return username.trim();
  }).filter(username => username.length > 0);
};

/**
 * Validates if a mention is properly formatted
 * @param {string} mention - The mention to validate
 * @returns {boolean} True if the mention is valid
 */
export const isValidMention = (mention) => {
  if (!mention || typeof mention !== 'string') {
    return false;
  }
  
  // Check if mention starts with @ and has valid characters
  return /^@[a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)*$/.test(mention);
};

/**
 * Extracts unique mentions from text
 * @param {string} text - The text to search
 * @returns {string[]} Array of unique mentioned usernames
 */
export const getUniqueMentions = (text) => {
  const mentions = findMentions(text);
  return [...new Set(mentions)];
};