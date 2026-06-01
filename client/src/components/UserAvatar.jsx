import { API_BASE } from "../api";

export default function UserAvatar({
  user,
  username,
  status = "offline",
  size = "md",
  className = "",
  onClick,
  title,
}) {
  const name = user?.username || username || "U";
  const avatarUrl = user?.avatar_url
    ? `${API_BASE}${user.avatar_url}`
    : null;

  return (
    <div
      className={`avatar avatar-${size} ${className}`.trim()}
      onClick={onClick}
      title={title}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} />
      ) : (
        <span>{name?.[0]?.toUpperCase() || "U"}</span>
      )}
      <span className={`status-dot ${status}`} title={status} />
    </div>
  );
}
