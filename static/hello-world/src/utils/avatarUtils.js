/**
 * Extract avatar URL from a Jira user object
 * @param {Object} user - The user object returned from Jira API
 * @param {string} size - The size of the avatar ('small', 'medium', 'large')
 * @returns {string|null} The avatar URL or null if not available
 */
export const getAvatarUrl = (user, size = "medium") => {
  if (!user || !user.avatarUrls) {
    return null;
  }

  // Jira API returns avatarUrls with keys like "16x16", "24x24", "32x32", "48x48"
  // Map size parameter to Jira size
  const sizeMap = {
    small: "24x24",
    medium: "32x32",
    large: "48x48",
  };

  const jiraSize = sizeMap[size] || "32x32";
  return user.avatarUrls[jiraSize] || null;
};

/**
 * Extract all avatar URLs from multiple users
 * @param {Object} users - Object mapping user names to user objects
 * @param {string} size - The size of the avatars
 * @returns {Object} Object mapping user names to avatar URLs
 */
export const getAvatarUrls = (users, size = "medium") => {
  const avatars = {};
  Object.entries(users).forEach(([name, user]) => {
    const url = getAvatarUrl(user, size);
    if (url) {
      avatars[name] = url;
    }
  });
  return avatars;
};

/**
 * Copy avatar URLs to clipboard as newline-separated list
 * @param {Object} avatars - Object mapping user names to avatar URLs
 * @returns {Promise<boolean>} True if copy was successful
 */
export const copyAvatarUrlsToClipboard = async (avatars) => {
  try {
    const urlList = Object.values(avatars).join("\n");
    await navigator.clipboard.writeText(urlList);
    return true;
  } catch (err) {
    console.error("Failed to copy avatar URLs:", err);
    return false;
  }
};

/**
 * Copy avatar URLs with user names to clipboard
 * @param {Object} avatars - Object mapping user names to avatar URLs
 * @returns {Promise<boolean>} True if copy was successful
 */
export const copyAvatarUrlsWithNamesToClipboard = async (avatars) => {
  try {
    const urlList = Object.entries(avatars)
      .map(([name, url]) => `${name}: ${url}`)
      .join("\n");
    await navigator.clipboard.writeText(urlList);
    return true;
  } catch (err) {
    console.error("Failed to copy avatar URLs with names:", err);
    return false;
  }
};

/**
 * Download an image from a URL
 * @param {string} url - The URL of the image
 * @param {string} filename - The filename to save as
 */
export const downloadImage = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlBlob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlBlob);
  } catch (err) {
    console.error("Failed to download image:", err);
    throw err;
  }
};
