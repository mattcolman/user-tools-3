import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userEmails, setUserEmails] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('email');

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

  const handleCopyNames = async () => {
    try {
      const nameList = Object.keys(userEmails)
        .map(name => {
          const parts = name.trim().split(/\s+/);
          if (parts.length >= 2) {
            return `${parts[0]} ${parts[parts.length - 1]}`;
          }
          return name;
        })
        .join("\n");
      await navigator.clipboard.writeText(nameList);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy names:", err);
      setError("Failed to copy names to clipboard");
    }
  };

  const getEmailList = () => Object.values(userEmails);
  
  const getNameList = () => Object.keys(userEmails).map(name => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return name;
  });

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
    return <div style={{ padding: "16px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2>Selected Text:</h2>
      <p>{selectedText}</p>

      {Object.keys(userEmails).length > 0 && (
        <>
          <div style={{ 
            borderBottom: "2px solid #DFE1E6", 
            marginBottom: "16px" 
          }}>
            <div style={{ display: "flex", gap: "0" }}>
              {['email', 'full name', 'avatar'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "12px 16px",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: activeTab === tab ? "600" : "400",
                    color: activeTab === tab ? "#0052CC" : "#42526E",
                    borderBottom: activeTab === tab ? "2px solid #0052CC" : "2px solid transparent",
                    textTransform: "capitalize"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'email' && (
            <div>
              <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                {getEmailList().map((email, index) => (
                  <li key={index} style={{ 
                    padding: "8px 0", 
                    borderBottom: "1px solid #F4F5F7",
                    fontSize: "14px"
                  }}>
                    {email}
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
                  Copy All
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
          )}

          {activeTab === 'full name' && (
            <div>
              <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                {getNameList().map((name, index) => (
                  <li key={index} style={{ 
                    padding: "8px 0", 
                    borderBottom: "1px solid #F4F5F7",
                    fontSize: "14px"
                  }}>
                    {name}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <button
                  onClick={handleCopyNames}
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
                  Copy All
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
          )}

          {activeTab === 'avatar' && (
            <div style={{ 
              padding: "32px", 
              textAlign: "center", 
              color: "#6B778C",
              fontSize: "14px"
            }}>
              Avatar functionality coming soon...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
