export default function TitleCard({ algo, onDone }) {
  if (!algo) return null;
  return (
    <div className="title-card" onClick={onDone} role="dialog" aria-label={`Episode ${algo.episode}: ${algo.title}`}>
      <div className="title-card-band band-top" />
      <div className="title-card-band band-bottom" />
      <div className="title-card-content">
        <div className="title-card-ep">EPISODE {String(algo.episode).padStart(2, "0")}</div>
        <div className="title-card-jp">{algo.jp}</div>
        <div className="title-card-title">{algo.title}</div>
        <div className="title-card-algo">{algo.name}</div>
      </div>
      <div className="title-card-skip">click to skip</div>
    </div>
  );
}
