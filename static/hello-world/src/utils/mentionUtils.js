/**
 * Utility functions for handling @mentions in Confluence page content (ADF)
 */

/**
 * Parses an ADF body value, which the Confluence API returns as a JSON string
 * @param {string|object} value - The `body.atlas_doc_format.value` of a page
 * @returns {object|null} The parsed ADF document, or null if it can't be parsed
 */
export const parseAdf = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

/**
 * Finds all mentions in an ADF document, in document order, without duplicates
 * @param {object} adf - An ADF document (or any ADF node)
 * @returns {{accountId: string, text: string}[]} The mentioned users
 */
export const findAdfMentions = (adf) => {
  const mentions = [];
  const seen = new Set();

  const visit = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const accountId = node.type === "mention" && node.attrs ? node.attrs.id : null;
    if (accountId && !seen.has(accountId)) {
      seen.add(accountId);
      mentions.push({
        accountId,
        text: String(node.attrs.text || "").replace(/^@/, ""),
      });
    }
    visit(node.content);
  };

  visit(adf);
  return mentions;
};
