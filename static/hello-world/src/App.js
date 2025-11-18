import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import { findMentions } from "./utils/mentionUtils";
import EmailsTab from "./components/EmailsTab";
import AvatarsTab from "./components/AvatarsTab";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userObjects, setUserObjects] = useState({});
  const [userEmails, setUserEmails] = useState({});
  const [activeTab, setActiveTab] = useState("emails");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const lookupUser = async (displayName) => {
    try {
      // Use the Jira REST API to search for users
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        // Return the full user object if found
        if (users && users.length > 0) {
          return users[0];
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
        const userObjectResults = {};
        const emailResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUser(mention);
            if (user) {
              userObjectResults[mention] = user;
              if (user.emailAddress) {
                emailResults[mention] = user.emailAddress;
              }
            }
          })
        );

        setUserObjects(userObjectResults);
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

  const hasUsers = Object.keys(userObjects).length > 0;

  return (
    <div style={{ padding: "16px" }}>
      <h2>Selected Text:</h2>
      <p style={{ color: "#44546F", margin: "8px 0 16px 0" }}>{selectedText}</p>

      {hasUsers ? (
        <>
          {/* Tab Navigation */}
          <div style={{ borderBottom: "1px solid #EBECF0", marginBottom: "16px" }}>
            <button
              onClick={() => setActiveTab("emails")}
              style={{
                padding: "12px 16px",
                backgroundColor: activeTab === "emails" ? "white" : "transparent",
                color: activeTab === "emails" ? "#0052CC" : "#626F86",
                border: "none",
                borderBottom: activeTab === "emails" ? "3px solid #0052CC" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === "emails" ? "600" : "400",
                marginRight: "8px",
              }}
            >
              Emails
            </button>
            <button
              onClick={() => setActiveTab("avatars")}
              style={{
                padding: "12px 16px",
                backgroundColor: activeTab === "avatars" ? "white" : "transparent",
                color: activeTab === "avatars" ? "#0052CC" : "#626F86",
                border: "none",
                borderBottom: activeTab === "avatars" ? "3px solid #0052CC" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === "avatars" ? "600" : "400",
              }}
            >
              Avatars
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ paddingTop: "8px" }}>
            {activeTab === "emails" && <EmailsTab userEmails={userEmails} />}
            {activeTab === "avatars" && <AvatarsTab userObjects={userObjects} />}
          </div>
        </>
      ) : (
        <p style={{ color: "#626F86" }}>No users found in the selected text.</p>
      )}
    </div>
  );
};

export default App;
