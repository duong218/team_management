import { useRef } from "react";
import { EyeOff, PawPrint } from "lucide-react";
import { PETS, usePet } from "./petSprites";
import "../../styles/pet.css";

// Mục "Thú cưng" ở sidebar: mở hộp thoại chọn 1 pet (hoặc ẩn). Lựa chọn lưu ở localStorage, xem usePet.
export default function PetPicker() {
  const dlg = useRef(null);
  const [pet, setPet] = usePet();
  return (
    <>
      <button type="button" className="nav-link pet-nav" aria-label="Thú cưng" title="Thú cưng" onClick={() => dlg.current.showModal()}>
        <PawPrint size={18} strokeWidth={1.8} />
        <span className="nav-text">Thú cưng</span>
      </button>
      <dialog ref={dlg} className="pet-dialog" aria-labelledby="pet-dlg-title" onClick={(e) => e.target === dlg.current && dlg.current.close()}>
        <h2 id="pet-dlg-title">Chọn thú cưng</h2>
        <p>Chỉ hiện 1 bé trên màn hình, lưu riêng trên trình duyệt này.</p>
        <div className="pet-grid">
          {[...Object.entries(PETS), ["none", null]].map(([id, p]) => {
            const a = p?.sit, [w, h] = p?.size || [];
            return (
              <button key={id} type="button" className="pet-opt" aria-pressed={pet === id} onClick={() => { setPet(id); dlg.current.close(); }}>
                <span className="pet-prev">
                  {p ? <span className="spr anim" style={{ display: "block", width: w, height: h, backgroundImage: `url(${a.src})`, backgroundSize: `${w * a.frames}px ${h}px`, "--sw": `${-w * a.frames}px`, "--n": a.frames, "--dur": `${a.frames / a.fps}s` }} /> : <EyeOff size={28} />}
                </span>
                <b>{p ? p.name : "Không hiện"}</b>
              </button>
            );
          })}
        </div>
        <button type="button" className="pet-close" onClick={() => dlg.current.close()}>Đóng</button>
      </dialog>
    </>
  );
}
