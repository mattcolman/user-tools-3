import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import { findMentions } from "./utils/mentionUtils";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userEmails, setUserEmails] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("mentions");

  const handleCopyEmails = async (format = "newline") => {
    try {
      let emailList;
      const emails = Object.values(userEmails);

      if (format === "comma") {
        emailList = emails.join(", ");
      } else if (format === "semicolon") {
        emailList = emails.join("; ");
      } else {
        // Default: newline
        emailList = emails.join("\n");
      }

      await navigator.clipboard.writeText(emailList);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset success message after 2 seconds
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const handleCopySingleEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
      setError("Failed to copy email to clipboard");
    }
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
    return <div style={{ padding: "16px" }}>Loading...</div>;
  }

  const tabStyles = {
    container: {
      padding: "16px",
    },
    tabsHeader: {
      display: "flex",
      borderBottom: "2px solid #091E424F",
      marginBottom: "16px",
    },
    tab: {
      padding: "12px 16px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      color: "#626F86",
      border: "none",
      backgroundColor: "transparent",
      borderBottom: "3px solid transparent",
      marginBottom: "-2px",
      transition: "all 0.2s ease",
    },
    activeTab: {
      color: "#0052CC",
      borderBottom: "3px solid #0052CC",
    },
    content: {
      paddingTop: "8px",
    },
    successMessage: {
      color: "#00875A",
      marginLeft: "8px",
      fontSize: "14px",
    },
    button: {
      padding: "8px 16px",
      backgroundColor: "#0052CC",
      color: "white",
      border: "none",
      borderRadius: "3px",
      cursor: "pointer",
      fontSize: "14px",
      marginRight: "8px",
      marginBottom: "8px",
    },
    emailItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: "1px solid #EBECF0",
    },
    secondaryButton: {
      padding: "4px 8px",
      backgroundColor: "#F7F8F9",
      color: "#0052CC",
      border: "1px solid #091E424F",
      borderRadius: "3px",
      cursor: "pointer",
      fontSize: "12px",
    },
  };

  return (
    <div style={tabStyles.container}>
      {/* Tabs Header */}
      <div style={tabStyles.tabsHeader}>
        <button
          onClick={() => setActiveTab("mentions")}
          style={{
            ...tabStyles.tab,
            ...(activeTab === "mentions" ? tabStyles.activeTab : {}),
          }}
        >
          Mentions
        </button>
        <button
          onClick={() => setActiveTab("copyEmails")}
          style={{
            ...tabStyles.tab,
            ...(activeTab === "copyEmails" ? tabStyles.activeTab : {}),
          }}
        >
          Copy Emails
        </button>
      </div>

      {/* Tab Content */}
      <div style={tabStyles.content}>
        {/* Mentions Tab */}
        {activeTab === "mentions" && (
          <div>
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
                    onClick={() => handleCopyEmails("newline")}
                    style={tabStyles.button}
                  >
                    Copy All (One per line)
                  </button>
                  {copySuccess && (
                    <span style={tabStyles.successMessage}>
                      ✓ Copied to clipboard!
                    </span>
                  )}
                </div>
              </>
            )}
            {Object.keys(userEmails).length === 0 && (
              <p style={{ color: "#626F86" }}>No @mentions found in selected text.</p>
            )}
          </div>
        )}

        {/* Copy Emails Tab */}
        {activeTab === "copyEmails" && (
          <div>
            <h2>User Emails</h2>
            {Object.keys(userEmails).length > 0 ? (
              <>
                <p style={{ color: "#626F86", marginBottom: "16px" }}>
                  Found {Object.keys(userEmails).length} user email{Object.keys(userEmails).length !== 1 ? "s" : ""}
                </p>

                {/* Copy Format Options */}
                <div style={{ marginBottom: "24px" }}>
                  <p style={{ fontSize: "12px", color: "#626F86", marginBottom: "8px" }}>
                    Copy All Emails As:
                  </p>
                  <div>
                    <button
                      onClick={() => handleCopyEmails("newline")}
                      style={tabStyles.button}
                    >
                      One Per Line
                    </button>
                    <button
                      onClick={() => handleCopyEmails("comma")}
                      style={tabStyles.button}
                    >
                      Comma Separated
                    </button>
                    <button
                      onClick={() => handleCopyEmails("semicolon")}
                      style={tabStyles.button}
                    >
                      Semicolon Separated
                    </button>
                  </div>
                  {copySuccess && (
                    <span style={tabStyles.successMessage}>
                      ✓ Copied to clipboard!
                    </span>
                  )}
                </div>

                {/* Individual Emails */}
                <div>
                  <p style={{ fontSize: "12px", color: "#626F86", marginBottom: "8px" }}>
                    Individual Emails:
                  </p>
                  {Object.entries(userEmails).map(([name, email]) => (
                    <div key={name} style={tabStyles.emailItem}>
                      <div>
                        <strong>@{name}</strong>
                        <div style={{ fontSize: "12px", color: "#626F86" }}>
                          {email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopySingleEmail(email)}
                        style={tabStyles.secondaryButton}
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "#626F86" }}>No user emails to copy. Check the Mentions tab.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
