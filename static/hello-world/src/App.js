import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userEmails, setUserEmails] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyEmails = async () => {
    try {
      const emailList = Object.values(userEmails).join("\n");
      await navigator.clipboard.writeText(emailList);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset success message after 2 seconds
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const findMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
  };

  const lookupUserEmail = async (displayName) => {
    try {
      // Use the Jira REST API to search for users
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        // Return the email of the first matching user
        if (users && users.length > 0) {
          return users[0].emailAddress;
        }
        return null;
      }
    } catch (err) {
      console.error(`Failed to lookup user ${displayName}:`, err);
      return null;
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const context = await view.getContext();
        const text = context.extension.selectedText;
        setSelectedText(text);

        // Find and process @mentions
        const mentions = findMentions(text);
        const emailResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const email = await lookupUserEmail(mention);
            if (email) {
              emailResults[mention] = email;
            }
          })
        );

        setUserEmails(emailResults);
      } catch (err) {
        setError(err.message);
        console.error("Failed to get context:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContext();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: "16px" }}>Error: {error}</div>;
  }

  if (isLoading) {
    return (
      <div style={{ padding: "16px" }}>
        <div className="skeleton-line" style={{ height: "20px", width: "60%" }}></div>
        <div className="skeleton-line" style={{ height: "16px", width: "90%" }}></div>
        <div className="skeleton-line" style={{ height: "16px", width: "40%" }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2>Selected Text:</h2>
      <p>{selectedText}</p>

      {Object.keys(userEmails).length > 0 && (
        <>
          <h3>Found Users:</h3>
          <ul>
            {Object.entries(userEmails).map(([name, email]) => (
              <li key={name}>
                @{name}: {email}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={handleCopyEmails}
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
