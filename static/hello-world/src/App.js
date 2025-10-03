import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import { findMentions } from "./utils/mentionUtils";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userEmails, setUserEmails] = useState({});
  const [userFullNames, setUserFullNames] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyType, setCopyType] = useState("");
  const [activeTab, setActiveTab] = useState("email");

  const handleCopyEmails = async () => {
    try {
      const emailList = Object.values(userEmails).join("\n");
      await navigator.clipboard.writeText(emailList);
      setCopySuccess(true);
      setCopyType("emails");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const handleCopyFullNames = async () => {
    try {
      const nameList = Object.values(userFullNames).join("\n");
      await navigator.clipboard.writeText(nameList);
      setCopySuccess(true);
      setCopyType("names");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy names:", err);
      setError("Failed to copy names to clipboard");
    }
  };


  const lookupUserData = async (displayName) => {
    try {
      // Use the Jira REST API to search for users
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        // Return the email and display name of the first matching user
        if (users && users.length > 0) {
          const user = users[0];
          return {
            email: user.emailAddress,
            fullName: user.displayName
          };
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
        const nameResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const userData = await lookupUserData(mention);
            if (userData) {
              emailResults[mention] = userData.email;
              nameResults[mention] = userData.fullName;
            }
          })
        );

        setUserEmails(emailResults);
        setUserFullNames(nameResults);
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
        <div>
          {/* Tab Navigation */}
          <div style={{ 
            borderBottom: "2px solid #DFE1E6",
            marginBottom: "16px"
          }}>
            <div style={{ display: "flex", gap: "0" }}>
              {["email", "fullname", "avatar"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: activeTab === tab ? "#0052CC" : "#626F86",
                    borderBottom: activeTab === tab ? "2px solid #0052CC" : "2px solid transparent",
                    marginBottom: "-2px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab === "email" ? "Email" : tab === "fullname" ? "Full Name" : "Avatar"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: "120px" }}>
            {activeTab === "email" && (
              <div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0" }}>
                  {Object.values(userEmails).map((email, index) => (
                    <li key={index} style={{ 
                      marginBottom: "8px",
                      padding: "4px 0",
                      fontSize: "14px"
                    }}>
                      {email}
                    </li>
                  ))}
                </ul>
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
                    fontWeight: "500"
                  }}
                >
                  Copy All
                </button>
                {copySuccess && copyType === "emails" && (
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
            )}

            {activeTab === "fullname" && (
              <div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0" }}>
                  {Object.values(userFullNames).map((name, index) => (
                    <li key={index} style={{ 
                      marginBottom: "8px",
                      padding: "4px 0",
                      fontSize: "14px"
                    }}>
                      {name}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCopyFullNames}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#0052CC",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Copy All
                </button>
                {copySuccess && copyType === "names" && (
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
            )}

            {activeTab === "avatar" && (
              <div style={{ 
                padding: "32px 0", 
                color: "#626F86",
                textAlign: "center",
                fontSize: "14px"
              }}>
                Avatar functionality coming soon...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
