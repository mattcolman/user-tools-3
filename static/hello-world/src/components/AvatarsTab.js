import React, { useState } from "react";
import {
  getAvatarUrl,
  copyAvatarUrlsToClipboard,
  copyAvatarUrlsWithNamesToClipboard,
  downloadImage,
} from "../utils/avatarUtils";

const AvatarsTab = ({ userObjects, onCopySuccess }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyMode, setCopyMode] = useState("urls"); // 'urls' or 'urls-with-names'
  const [downloadError, setDownloadError] = useState(null);

  const avatars = {};
  Object.entries(userObjects).forEach(([name, user]) => {
    const url = getAvatarUrl(user, "medium");
    if (url) {
      avatars[name] = url;
    }
  });

  const handleCopyAvatarUrls = async () => {
    setDownloadError(null);
    let success = false;

    if (copyMode === "urls") {
      success = await copyAvatarUrlsToClipboard(avatars);
    } else {
      success = await copyAvatarUrlsWithNamesToClipboard(avatars);
    }

    if (success) {
      setCopySuccess(true);
      onCopySuccess?.();
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadAvatar = async (name, url) => {
    try {
      setDownloadError(null);
      await downloadImage(url, `${name}-avatar.jpg`);
    } catch (err) {
      setDownloadError(`Failed to download ${name}'s avatar`);
      console.error("Download error:", err);
    }
  };

  if (Object.keys(avatars).length === 0) {
    return <div style={{ padding: "0px", color: "#626F86" }}>No avatars found</div>;
  }

  return (
    <div>
      <h3 style={{ marginTop: "0" }}>User Avatars:</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "16px",
          margin: "16px 0",
        }}
      >
        {Object.entries(avatars).map(([name, url]) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px",
              border: "1px solid #EBECF0",
              borderRadius: "4px",
              backgroundColor: "#FAFBFC",
            }}
          >
            <img
              src={url}
              alt={name}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                marginBottom: "8px",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center" }}>
              @{name}
            </span>
            <button
              onClick={() => handleDownloadAvatar(name, url)}
              style={{
                marginTop: "8px",
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor: "#F7F8F9",
                border: "1px solid #EBECF0",
                borderRadius: "3px",
                cursor: "pointer",
                color: "#44546F",
              }}
            >
              Download
            </button>
          </div>
        ))}
      </div>

      {downloadError && (
        <div style={{ color: "#AE2A19", marginBottom: "12px", fontSize: "14px" }}>
          {downloadError}
        </div>
      )}

      <div style={{ marginTop: "16px" }}>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ marginRight: "16px", fontSize: "14px" }}>
            <input
              type="radio"
              value="urls"
              checked={copyMode === "urls"}
              onChange={(e) => setCopyMode(e.target.value)}
              style={{ marginRight: "4px" }}
            />
            Copy URLs only
          </label>
          <label style={{ fontSize: "14px" }}>
            <input
              type="radio"
              value="urls-with-names"
              checked={copyMode === "urls-with-names"}
              onChange={(e) => setCopyMode(e.target.value)}
              style={{ marginRight: "4px" }}
            />
            Copy URLs with names
          </label>
        </div>

        <button
          onClick={handleCopyAvatarUrls}
          style={{
            padding: "8px 16px",
            backgroundColor: "#0052CC",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Copy Avatar URLs
        </button>
        {copySuccess && (
          <span
            style={{
              color: "#00875A",
              marginLeft: "8px",
              fontSize: "14px",
            }}
          >
            ✓ Copied to clipboard!
          </span>
        )}
      </div>
    </div>
  );
};

export default AvatarsTab;
