import React, { useState, useEffect } from "react";
import { view, requestConfluence, requestJira } from "@forge/bridge";
import { findAdfMentions, parseAdf } from "./utils/mentionUtils";

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
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const emails = users.map((user) => user.email).filter(Boolean);

  const handleCopyEmails = async () => {
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
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
                user && user.avatarUrls ? user.avatarUrls["48x48"] : null,
            };
          })
        );

        setUsers(resolved);
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

  return (
    <div style={{ padding: "16px" }}>
      <h2>Mentioned Users</h2>

      {users.length === 0 ? (
        <p>No @mentions found on this page.</p>
      ) : (
        <>
          <ul>
            {users.map((user) => (
              <li key={user.accountId}>
                {user.name}
                {user.email ? `: ${user.email}` : ""}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={handleCopyEmails}
              disabled={emails.length === 0}
              style={{
                padding: "8px 16px",
                backgroundColor: emails.length === 0 ? "#DFE1E6" : "#0052CC",
                color: emails.length === 0 ? "#A5ADBA" : "white",
                border: "none",
                borderRadius: "3px",
                cursor: emails.length === 0 ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              Copy Email Addresses
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
        </>
      )}
    </div>
  );
};

export default App;
