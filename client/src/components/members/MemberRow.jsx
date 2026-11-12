export default function MemberRow({ member, children }) {
  return (
    <div className="member-row">
      <strong>{member.ho_ten || "Thành viên"}</strong>
      <span>{member.vai_tro}</span>
      {children}
    </div>
  );
}
