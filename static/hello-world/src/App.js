import React, { useState, useEffect } from "react";
import Button from "@atlaskit/button/new";
import { view, requestConfluence, requestJira } from "@forge/bridge";
import { findAdfMentions, parseAdf } from "./utils/mentionUtils";
import {
  copyAvatarsToClipboard,
  downloadAvatarSheet,
  withAvatarSize,
} from "./utils/avatarUtils";
import UserCard from "./UserCard";

const AVATAR_EXPORT_SIZE = 256;

const fetchPageMentions = async (pageId) => {
  const response = await requestConfluence(
    `/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`
  );

  if (!response.ok) {
    throw new Error(`Failed to load page content (${response.status})`);
  }

  const page = await response.json();
  const adf = parseAdf(
    page.body && page.body.atlas_doc_format
      ? page.body.atlas_doc_format.value
      : null
  );

  return findAdfMentions(adf);
};

const fetchUser = async (accountId) => {
  try {
    const response = await requestJira(
      `/rest/api/3/user?accountId=${encodeURIComponent(accountId)}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`Failed to look up user ${accountId}:`, err);
    return null;
  }
};

const App = () => {
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const selectedUsers = users.filter((user) =>
    selectedIds.includes(user.accountId)
  );
  const emails = selectedUsers.map((user) => user.email).filter(Boolean);
  const avatarUrls = selectedUsers.map((user) => user.avatarUrl).filter(Boolean);

  const showStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 2000);
  };

  const toggleUser = (accountId) => {
    setSelectedIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  };

  const handleCopyEmails = async () => {
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      showStatus("✓ Copied email addresses");
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const handleCopyAvatars = async () => {
    try {
      await copyAvatarsToClipboard(avatarUrls, { size: AVATAR_EXPORT_SIZE });
      showStatus("✓ Copied avatars — paste them into Figma");
    } catch (err) {
      console.error("Failed to copy avatars:", err);
      try {
        await navigator.clipboard.writeText(avatarUrls.join("\n"));
        showStatus("Couldn't copy the images, copied avatar URLs instead");
      } catch (textErr) {
        console.error("Failed to copy avatar URLs:", textErr);
        setError("Failed to copy avatars to clipboard");
      }
    }
  };

  const handleDownloadAvatars = async () => {
    try {
      await downloadAvatarSheet(avatarUrls, { size: AVATAR_EXPORT_SIZE });
      showStatus("✓ Downloaded avatars.png");
    } catch (err) {
      console.error("Failed to download avatars:", err);
      setError("Failed to download avatars");
    }
  };

  useEffect(() => {
    const loadMentionedUsers = async () => {
      try {
        const context = await view.getContext();
        const pageId = context.extension.content.id;
        const mentions = await fetchPageMentions(pageId);

        const resolved = await Promise.all(
          mentions.map(async (mention) => {
            const user = await fetchUser(mention.accountId);
            return {
              accountId: mention.accountId,
              name: (user && user.displayName) || mention.text,
              email: user ? user.emailAddress : null,
              avatarUrl:
                user && user.avatarUrls
                  ? withAvatarSize(user.avatarUrls["48x48"], AVATAR_EXPORT_SIZE)
                  : null,
            };
          })
        );

        setUsers(resolved);
        setSelectedIds(resolved.map((user) => user.accountId));
      } catch (err) {
        setError(err.message);
        console.error("Failed to load mentioned users:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMentionedUsers();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: "16px" }}>Error: {error}</div>;
  }

  if (isLoading) {
    return <div style={{ padding: "16px" }}>Loading...</div>;
  }

  if (users.length === 0) {
    return (
      <div style={{ padding: "16px" }}>
        <h2>Mentioned Users</h2>
        <p>No @mentions found on this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2>Mentioned Users</h2>
      <p>
        {selectedUsers.length} of {users.length} selected
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {users.map((user) => (
          <UserCard
            key={user.accountId}
            user={user}
            isSelected={selectedIds.includes(user.accountId)}
            onToggle={toggleUser}
          />
        ))}
      </div>

      <div
        style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
      >
        <Button
          appearance="subtle"
          onClick={() => setSelectedIds(users.map((user) => user.accountId))}
          isDisabled={selectedUsers.length === users.length}
        >
          Select all
        </Button>
        <Button
          appearance="subtle"
          onClick={() => setSelectedIds([])}
          isDisabled={selectedUsers.length === 0}
        >
          Select none
        </Button>
        <Button
          appearance="primary"
          onClick={handleCopyAvatars}
          isDisabled={avatarUrls.length === 0}
        >
          Copy avatars
        </Button>
        <Button onClick={handleCopyEmails} isDisabled={emails.length === 0}>
          Copy email addresses
        </Button>
        <Button
          onClick={handleDownloadAvatars}
          isDisabled={avatarUrls.length === 0}
        >
          Download avatars
        </Button>
        {status && (
          <span style={{ color: "#00875A", fontSize: "14px" }}>{status}</span>
        )}
      </div>
    </div>
  );
};

export default App;
