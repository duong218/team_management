import MemberRow from "./MemberRow";
export default function MemberList({ members = [] }) {
  return (
    <div>
      {members.map((m) => (
        <MemberRow key={m.id} member={m} />
      ))}
    </div>
  );
}
