import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Button from "@atlaskit/button";
import { Stack } from "@atlaskit/primitives";

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [users, setUsers] = useState([]);
  const [copyEmailSuccess, setCopyEmailSuccess] = useState(false);
  const [copyNameSuccess, setCopyNameSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleCopyEmails = async () => {
    try {
      const emailList = users.map((u) => u.email).join("\n");
      await navigator.clipboard.writeText(emailList);
      setCopyEmailSuccess(true);
      setTimeout(() => setCopyEmailSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy emails:", err);
      setError("Failed to copy emails to clipboard");
    }
  };

  const handleCopyNames = async () => {
    try {
      const nameList = users.map((u) => u.name).join("\n");
      await navigator.clipboard.writeText(nameList);
      setCopyNameSuccess(true);
      setTimeout(() => setCopyNameSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy names:", err);
      setError("Failed to copy names to clipboard");
    }
  };

  const findMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
  };

  const lookupUser = async (displayName) => {
    try {
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(displayName)}`
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`User lookup response for ${displayName}:`, users);

        if (users && users.length > 0) {
          const u = users[0];
          return { name: u.displayName, email: u.emailAddress };
        }
      }
      return null;
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
        const userResults = [];

        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUser(mention);
            if (user) {
              userResults.push(user);
            }
          })
        );

        setUsers(userResults);
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
      {users.length > 0 && (
        <Tabs id="user-tabs">
          <TabList>
            <Tab>Email</Tab>
            <Tab>Full Name</Tab>
            <Tab>Avatar</Tab>
          </TabList>
          <TabPanel>
            <Stack>
              <ul>
                {users.map((u) => (
                  <li key={u.email}>{u.email}</li>
                ))}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <Button appearance="primary" onClick={handleCopyEmails}>
                  Copy All
                </Button>
                {copyEmailSuccess && (
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
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack>
              <ul>
                {users.map((u) => (
                  <li key={u.email}>{u.name}</li>
                ))}
              </ul>
              <div style={{ marginTop: "16px" }}>
                <Button appearance="primary" onClick={handleCopyNames}>
                  Copy All
                </Button>
                {copyNameSuccess && (
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
            </Stack>
          </TabPanel>
          <TabPanel>{/* avatar content coming soon */}</TabPanel>
        </Tabs>
      )}
    </div>
  );
};

export default App;
