import React from "react";
import Avatar from "@atlaskit/avatar";
import Checkbox from "@atlaskit/checkbox";

const UserCard = ({ user, isSelected, onToggle }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      border: "1px solid #DFE1E6",
      borderRadius: "6px",
      opacity: isSelected ? 1 : 0.5,
    }}
  >
    <Checkbox
      isChecked={isSelected}
      onChange={() => onToggle(user.accountId)}
      label=""
      aria-label={`Include ${user.name}`}
    />
    <Avatar src={user.avatarUrl} name={user.name} size="xlarge" />
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600 }}>{user.name}</div>
      <div style={{ color: "#6B778C", fontSize: "12px", overflowWrap: "anywhere" }}>
        {user.email || "No email available"}
      </div>
    </div>
  </div>
);

export default UserCard;
