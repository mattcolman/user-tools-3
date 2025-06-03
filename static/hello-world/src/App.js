import React, { useState, useEffect } from "react";
import { view, requestJira } from "@forge/bridge";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { token } from "@atlaskit/tokens";
import styled from '@emotion/styled';

const PanelContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  flex-grow: 1;
  background-color: ${token('color.background.neutral')};
  color: ${token('color.text.subtlest')};
  border-radius: 3px;
  padding: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
`;

const Container = styled.div`
  padding: 1rem;
`;

const List = styled.ul`
  margin-bottom: 1rem;
  width: 100%;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${token('color.background.brand.bold')};
  color: ${token('color.text.inverse')};
  border-radius: 3px;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
`;

const SuccessMessage = styled.div`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 3px;
  font-size: 0.875rem;
  background-color: ${token('color.background.success.bold')};
  color: ${token('color.text.inverse')};
`;

const ErrorMessage = styled.div`
  color: ${token('color.text.danger')};
  padding: 1rem;
`;

const LoadingMessage = styled.div`
  padding: 1rem;
`;

const ComingSoonText = styled.div`
  font-size: 0.875rem;
  text-align: center;
  color: ${token('color.text.subtlest')};
`;

const Panel = ({ children, testId }) => (
  <PanelContainer data-testid={testId}>
    {children}
  </PanelContainer>
);

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  const handleCopy = async (type) => {
    try {
      let textToCopy;
      if (type === "email") {
        textToCopy = Object.values(userData)
          .map((user) => user.emailAddress)
          .join("\n");
      } else if (type === "fullname") {
        textToCopy = Object.values(userData)
          .map((user) => `${user.displayName}`)
          .join("\n");
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset success message after 2 seconds
    } catch (err) {
      console.error(`Failed to copy ${type}s:`, err);
      setError(`Failed to copy ${type}s to clipboard`);
    }
  };

  const findMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    return [...text.matchAll(mentionRegex)].map((match) => match[1]);
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

        // Return the first matching user
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
        const userResults = {};

        // Look up each mentioned user
        await Promise.all(
          mentions.map(async (mention) => {
            const user = await lookupUser(mention);
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
    return <ErrorMessage>Error: {error}</ErrorMessage>;
  }

  if (isLoading) {
    return <LoadingMessage>Loading...</LoadingMessage>;
  }

  // Map of tab indices to values for the onChange handler
  const tabValues = ["email", "fullname", "avatar"];

  return (
    <Container>
      {Object.keys(userData).length > 0 && (
        <Tabs
          id="user-data-tabs"
          onChange={(index) => setActiveTab(tabValues[index])}
        >
          <TabList>
            <Tab>Email</Tab>
            <Tab>Full Name</Tab>
            <Tab>Avatar</Tab>
          </TabList>

          <TabPanel>
            <Panel>
              <List>
                {Object.values(userData).map((user) => (
                  <li key={user.accountId}>{user.emailAddress}</li>
                ))}
              </List>
              <div>
                <Button onClick={() => handleCopy("email")}>
                  Copy All Emails
                </Button>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel>
            <Panel>
              <List>
                {Object.values(userData).map((user) => (
                  <li key={user.accountId}>{user.displayName}</li>
                ))}
              </List>
              <div>
                <Button onClick={() => handleCopy("fullname")}>
                  Copy All Names
                </Button>
              </div>
            </Panel>
          </TabPanel>

          <TabPanel>
            <Panel>
              <ComingSoonText>
                Avatar feature coming soon...
              </ComingSoonText>
            </Panel>
          </TabPanel>

          {copySuccess && (
            <SuccessMessage>
              ✓ Copied to clipboard!
            </SuccessMessage>
          )}
        </Tabs>
      )}
    </Container>
  );
};

export default App;
