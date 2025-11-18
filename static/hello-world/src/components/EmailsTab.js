import React, { useState } from "react";

const EmailsTab = ({ userEmails, onCopySuccess }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyEmails = async () => {
    try {
      const emailList = Object.values(userEmails).join("\n");
      await navigator.clipboard.writeText(emailList);
      setCopySuccess(true);
      onCopySuccess?.();
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy emails:", err);
    }
  };

  if (Object.keys(userEmails).length === 0) {
    return <div style={{ padding: "16px", color: "#626F86" }}>No users found</div>;
  }

  return (
    <div>
      <h3 style={{ marginTop: "0" }}>Found Users:</h3>
      <ul style={{ margin: "8px 0" }}>
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
    </div>
  );
};

export default EmailsTab;
