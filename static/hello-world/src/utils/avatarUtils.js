/**
 * Utility functions for working with Atlassian avatar images
 */

const SIZE_PARAMS = ["size", "s"];

/**
 * Rewrites an Atlassian avatar URL to request a larger rendition.
 * Jira returns URLs such as `.../initials/MK-5.png?size=48&s=48`, so the size
 * is controlled by query params rather than by the path.
 * @param {string} url - The avatar URL as returned by the API
 * @param {number} size - The requested pixel size
 * @returns {string|null} The resized URL, or null when there is no URL
 */
export const withAvatarSize = (url, size) => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    const present = SIZE_PARAMS.filter((param) =>
      parsed.searchParams.has(param)
    );

    if (present.length === 0) {
      parsed.searchParams.set("size", String(size));
    } else {
      present.forEach((param) => parsed.searchParams.set(param, String(size)));
    }

    return parsed.toString();
  } catch (err) {
    return url;
  }
};

/**
 * The grid used to lay avatars out on a single sheet image
 * @param {number} count - How many avatars are being laid out
 * @returns {{columns: number, rows: number}} The sheet dimensions
 */
export const avatarSheetLayout = (count) => {
  if (count <= 0) {
    return { columns: 0, rows: 0 };
  }
  const columns = Math.ceil(Math.sqrt(count));
  return { columns, rows: Math.ceil(count / columns) };
};

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load avatar: ${url}`));
    image.src = url;
  });

/**
 * Draws the given avatars onto a single transparent PNG, so that one clipboard
 * image carries every selected avatar into a design tool.
 * @param {string[]} urls - Avatar URLs
 * @param {{size?: number, gap?: number}} options - Cell size and gap in pixels
 * @returns {Promise<Blob>} The rendered sheet
 */
export const createAvatarSheet = async (urls, { size = 256, gap = 16 } = {}) => {
  const images = await Promise.all(urls.map(loadImage));
  const { columns, rows } = avatarSheetLayout(images.length);

  const canvas = document.createElement("canvas");
  canvas.width = columns * size + Math.max(columns - 1, 0) * gap;
  canvas.height = rows * size + Math.max(rows - 1, 0) * gap;

  const context = canvas.getContext("2d");
  images.forEach((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    context.drawImage(
      image,
      column * (size + gap),
      row * (size + gap),
      size,
      size
    );
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to render avatar sheet"));
      }
    }, "image/png");
  });
};

/**
 * Copies the given avatars to the clipboard as a single PNG.
 * @param {string[]} urls - Avatar URLs
 * @param {{size?: number, gap?: number}} options - Passed to createAvatarSheet
 * @returns {Promise<void>}
 */
export const copyAvatarsToClipboard = async (urls, options) => {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
    throw new Error("Copying images is not supported in this browser");
  }

  const blob = await createAvatarSheet(urls, options);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
};

/**
 * Downloads the given avatars as a single PNG sheet.
 * @param {string[]} urls - Avatar URLs
 * @param {{size?: number, gap?: number, fileName?: string}} options - Sheet options
 * @returns {Promise<void>}
 */
export const downloadAvatarSheet = async (
  urls,
  { fileName = "avatars.png", ...options } = {}
) => {
  const blob = await createAvatarSheet(urls, options);
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};
