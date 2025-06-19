import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import { Tabs, Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Button from "@atlaskit/button";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState({
    email: false,
    fullName: false,
  });

  const handleCopyEmails = async () => {
    try {
      const emailList = Object.values(userData)
        .map(user => user.email)
        .filter(email => email)
        .join("\n");
      await navigator.clipboard.writeText(emailList);
      setCopySuccess(prev => ({ ...prev, email: true }));
      setTimeout(() => setCopySuccess(prev => ({ ...prev, email: false })), 2000);
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const handleCopyFullNames = async () => {
    try {
      const nameList = Object.values(userData)
        .map(user => user.displayName)
        .filter(name => name)
        .join("\n");
      await navigator.clipboard.writeText(nameList);
      setCopySuccess(prev => ({ ...prev, fullName: true }));
      setTimeout(() => setCopySuccess(prev => ({ ...prev, fullName: false })), 2000);
    } catch (err) {
      console.error("Failed to copy names:", err);
      setError("Failed to copy names to clipboard");
    }
  };

  const findMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
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

        // Return user data of the first matching user
        if (users && users.length > 0) {
          const user = users[0];
          return {
            email: user.emailAddress,
            displayName: user.displayName,
            accountId: user.accountId,
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
        const userResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUserData(mention);
            if (user) {
              userResults[mention] = user;
            }
          })
        );

        setUserData(userResults);
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

      {Object.keys(userData).length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <Tabs id="user-data-tabs">
            <TabList>
              <Tab>Email</Tab>
              <Tab>Full Name</Tab>
              <Tab>Avatar</Tab>
            </TabList>
            
            <TabPanel>
              <div style={{ padding: "16px 0" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.values(userData).map((user, index) => (
                    <li key={index} style={{ marginBottom: "8px", fontSize: "14px" }}>
                      {user.email}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "16px" }}>
                  <Button appearance="primary" onClick={handleCopyEmails}>
                    Copy All
                  </Button>
                  {copySuccess.email && (
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
            </TabPanel>
            
            <TabPanel>
              <div style={{ padding: "16px 0" }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.values(userData).map((user, index) => (
                    <li key={index} style={{ marginBottom: "8px", fontSize: "14px" }}>
                      {user.displayName}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "16px" }}>
                  <Button appearance="primary" onClick={handleCopyFullNames}>
                    Copy All
                  </Button>
                  {copySuccess.fullName && (
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
            </TabPanel>
            
            <TabPanel>
              <div style={{ padding: "16px 0", color: "#6B778C", fontStyle: "italic" }}>
                Avatar functionality coming soon...
              </div>
            </TabPanel>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default App;
