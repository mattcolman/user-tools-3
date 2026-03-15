import React, { useEffect, useState } from "react";
import { view, requestJira } from "@forge/bridge";
import { findMentions } from "./utils/mentionUtils";

const TABS = [
  { id: "full-names", label: "Full names" },
  { id: "emails", label: "Emails" },
  { id: "avatars", label: "Avatar images" },
];

const styles = {
  appShell: {
    backgroundColor: "#F4F5F7",
    minHeight: "100vh",
    padding: "20px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: "#172B4D",
  },
  paper: {
    maxWidth: "820px",
    margin: "0 auto",
    borderRadius: "12px",
    border: "1px solid #DFE1E6",
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(9, 30, 66, 0.25)",
    overflow: "hidden",
  },
  section: {
    padding: "20px",
  },
  title: {
    marginTop: 0,
    marginBottom: "12px",
  },
  selectedText: {
    margin: 0,
    fontSize: "14px",
    backgroundColor: "#F4F5F7",
    borderRadius: "8px",
    padding: "12px",
  },
  tabs: {
    display: "flex",
    gap: "6px",
    borderTop: "1px solid #EBECF0",
    borderBottom: "1px solid #EBECF0",
    backgroundColor: "#FAFBFC",
    padding: "10px 12px 0",
  },
  tab: {
    border: "none",
    backgroundColor: "transparent",
    borderBottom: "2px solid transparent",
    color: "#42526E",
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  activeTab: {
    color: "#0052CC",
    borderBottomColor: "#0052CC",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: "8px",
  },
  listItem: {
    border: "1px solid #EBECF0",
    borderRadius: "8px",
    backgroundColor: "#FAFBFC",
    padding: "10px 12px",
    fontSize: "14px",
  },
  copyButton: {
    marginTop: "16px",
    padding: "8px 16px",
    backgroundColor: "#0052CC",
    border: "none",
    borderRadius: "3px",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  avatarGrid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
  },
  avatarTile: {
    border: "1px solid #EBECF0",
    borderRadius: "8px",
    backgroundColor: "#FAFBFC",
    padding: "12px",
    textAlign: "center",
  },
  avatarImage: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    marginBottom: "8px",
  },
};

const Paper = ({ children }) => <section style={styles.paper}>{children}</section>;

const App = () => {
  const [selectedText, setSelectedText] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const lookupUser = async (mention) => {
    try {
      const response = await requestJira(
        `/rest/api/3/user/search?query=${encodeURIComponent(mention)}`
      );

      if (!response.ok) {
        return null;
      }

      const jiraUsers = await response.json();
      if (!jiraUsers?.length) {
        return null;
      }

      const jiraUser = jiraUsers[0];
      return {
        mention,
        fullName: jiraUser.displayName || mention,
        email: jiraUser.emailAddress || "No email available",
        avatarUrl: jiraUser.avatarUrls?.["48x48"] || jiraUser.avatarUrls?.["24x24"] || "",
      };
    } catch (lookupError) {
      console.error(`Failed to lookup user ${mention}:`, lookupError);
      return null;
    }
  };

  const handleCopyEmails = async () => {
    try {
      await navigator.clipboard.writeText(users.map((user) => user.email).join("\n"));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (copyError) {
      console.error("Failed to copy emails:", copyError);
      setError("Failed to copy emails to clipboard");
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const context = await view.getContext();
        const text = context.extension.selectedText;
        setSelectedText(text);

        const mentions = findMentions(text);
        const foundUsers = await Promise.all(mentions.map((mention) => lookupUser(mention)));
        setUsers(foundUsers.filter(Boolean));
      } catch (contextError) {
        console.error("Failed to get context:", contextError);
        setError(contextError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, []);

  if (error) {
    return <div style={{ color: "#DE350B", padding: "16px" }}>Error: {error}</div>;
  }

  if (isLoading) {
    return <div style={{ padding: "16px" }}>Loading...</div>;
  }

  const hasUsers = users.length > 0;

  return (
    <div style={styles.appShell}>
      <Paper>
        <div style={styles.section}>
          <h2 style={styles.title}>User Tools Forge</h2>
          <h3 style={{ marginTop: 0 }}>Selected Text</h3>
          <p style={styles.selectedText}>{selectedText}</p>
        </div>

        {hasUsers && (
          <>
            <div style={styles.tabs} role="tablist" aria-label="User tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${tab.id}-tab`}
                  aria-controls={`${tab.id}-panel`}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ ...styles.tab, ...(activeTab === tab.id ? styles.activeTab : {}) }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={styles.section}>
              {activeTab === "full-names" && (
                <div role="tabpanel" id="full-names-panel" aria-labelledby="full-names-tab">
                  <ul style={styles.list}>
                    {users.map((user) => (
                      <li key={user.mention} style={styles.listItem}>
                        @{user.mention}: {user.fullName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "emails" && (
                <div role="tabpanel" id="emails-panel" aria-labelledby="emails-tab">
                  <ul style={styles.list}>
                    {users.map((user) => (
                      <li key={user.mention} style={styles.listItem}>
                        @{user.mention}: {user.email}
                      </li>
                    ))}
                  </ul>
                  <button style={styles.copyButton} onClick={handleCopyEmails}>
                    Copy Email Addresses
                  </button>
                  {copySuccess && <span style={{ marginLeft: "8px", color: "#00875A" }}>✓ Copied to clipboard!</span>}
                </div>
              )}

              {activeTab === "avatars" && (
                <div role="tabpanel" id="avatars-panel" aria-labelledby="avatars-tab">
                  <div style={styles.avatarGrid}>
                    {users.map((user) => (
                      <div key={user.mention} style={styles.avatarTile}>
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={`${user.fullName} avatar`}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <div
                            style={{
                              ...styles.avatarImage,
                              backgroundColor: "#DFE1E6",
                              margin: "0 auto 8px",
                            }}
                          />
                        )}
                        <div style={{ fontSize: "13px" }}>{user.fullName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Paper>
    </div>
  );
};

export default App;
