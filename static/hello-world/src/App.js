import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import { findMentions } from "./utils/mentionUtils";
import Tabs from "@atlaskit/tabs";
import Button from "@atlaskit/button";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [usersByMention, setUsersByMention] = useState({}); // { mention: { email, displayName, avatarUrl } }
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState("");

  const copyToClipboard = async (textToCopy, successMessage) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(successMessage);
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setError("Failed to copy to clipboard");
    }
  };

  const lookupUser = async (displayName) => {
    try {
      // Use the Jira REST API to search for users
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        if (users && users.length > 0) {
          const u = users[0];
          return {
            email: u.emailAddress || "",
            displayName: u.displayName || displayName,
            avatarUrl: (u.avatarUrls && (u.avatarUrls[48] || u.avatarUrls[24] || u.avatarUrls[16])) || "",
          };
        }
        return null;
      } else {
        console.error("User search failed with status:", response.status);
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
        const resultMap = {};

        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUser(mention);
            if (user) {
              resultMap[mention] = user;
            }
          })
        );

        setUsersByMention(resultMap);
      } catch (err) {
        setError(err.message || "Unknown error");
        console.error("Failed to get context:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContext();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: 16 }}>Error: {error}</div>;
  }

  if (isLoading) {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  const emails = Object.values(usersByMention).map((u) => u.email).filter(Boolean);
  const fullNames = Object.values(usersByMention).map((u) => u.displayName).filter(Boolean);

  return (
    <div style={{ padding: 16 }}>
      <h2>Selected Text:</h2>
      <p>{selectedText}</p>

      {Object.keys(usersByMention).length > 0 && (
        <Tabs
          id="user-tools-tabs"
          tabs={[
            {
              label: "Email",
              content: (
                <div>
                  <h3 style={{ marginTop: 0 }}>Email addresses</h3>
                  <ul>
                    {emails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      appearance="primary"
                      onClick={() => copyToClipboard(emails.join("\n"), "Emails copied")}
                      isDisabled={emails.length === 0}
                    >
                      Copy all
                    </Button>
                    {copySuccess === "Emails copied" && (
                      <span style={{ color: "#00875A", marginLeft: 8, fontSize: 14 }}>
                        ✓ Copied to clipboard!
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              label: "Full name",
              content: (
                <div>
                  <h3 style={{ marginTop: 0 }}>Full names</h3>
                  <ul>
                    {fullNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      appearance="primary"
                      onClick={() => copyToClipboard(fullNames.join("\n"), "Names copied")}
                      isDisabled={fullNames.length === 0}
                    >
                      Copy all
                    </Button>
                    {copySuccess === "Names copied" && (
                      <span style={{ color: "#00875A", marginLeft: 8, fontSize: 14 }}>
                        ✓ Copied to clipboard!
                      </span>
                    )}
                  </div>
                </div>
              ),
            },
            { label: "Avatar", content: <div /> },
          ]}
        />
      )}
    </div>
  );
};

export default App;
