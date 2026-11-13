import { useEffect, useState } from "react";
import confetti from "../../assets/symbolic-box-confetti.svg";
import "../../styles/task-celebration.css";

export default function TaskCelebration() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);
  return visible ? <div className="task-celebration" aria-hidden="true"><img src={confetti} alt="" /></div> : null;
}
