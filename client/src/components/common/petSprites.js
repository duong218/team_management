import { useSyncExternalStore } from "react";

// Mèo: bộ "Cat player" của Jump Button (jumpbutton.itch.io/cat-player-asset), khung 32×32, phóng 2×.
// Hiệp sĩ: bộ "Knight player" và "Red Cape Knight" cũng của Jump Button; đã cắt sát nhân vật, hiệp sĩ áo đỏ thu nhỏ 0.5×.
// Cáo: "Fox - Animated Pixel Character" của hanguyen-lisa (itch.io), dùng miễn phí. Mèo xám và chó cam: "Cat & Dog - Free Sprites" của pzUH (opengameart.org), CC0.
// Giấy phép của Jump Button: dùng cá nhân thoải mái; dùng thương mại BẮT BUỘC ghi credit tác giả (Jump Button). Sửa ảnh được, không bán lại ảnh.
//
// Mỗi pet: size [rộng, cao] của 1 khung, facing (1 = ảnh gốc quay mặt sang phải), say (câu nói khi chạm vào),
// và các trạng thái sit · walk · sleep · jump · fall · land · held. Mỗi trạng thái: { src } hoặc
// { src, frames, fps } cho sprite sheet xếp ngang 1 hàng. Thiếu trạng thái nào thì PetCat tự dùng cái gần nhất.
const sheets = (dir, f) =>
  Object.fromEntries(Object.entries(f).map(([k, [frames, fps]]) => [k, { src: `/pet/${dir}/${k}.png`, frames, fps }]));

const knight = sheets("knight", { sit: [4, 4], walk: [7, 9], sleep: [3, 2], jump: [6, 8], fall: [3, 8], land: [4, 16] });
const fox = sheets("fox", { sit: [6, 5], walk: [4, 6], jump: [4, 5], fall: [1, 5] });
const cartoon = (dir) => sheets(dir, { sit: [10, 8], walk: [10, 12], jump: [8, 10], fall: [8, 10], land: [10, 16] });
const graycat = cartoon("graycat"), dog = cartoon("dog");
const red = sheets("red", { sit: [5, 4], walk: [9, 10], sleep: [3, 2], jump: [4, 8], fall: [4, 8], land: [4, 16] });

export const PETS = {
  cat: {
    name: "Mèo", say: "Meo~", size: [64, 64], facing: 1,
    sit: { src: "/pet/idle.png", frames: 3, fps: 3 },
    walk: { src: "/pet/walk.png", frames: 3, fps: 7 },
    sleep: { src: "/pet/sleep.png", frames: 5, fps: 2 },
    jump: { src: "/pet/jump.png" },
    fall: { src: "/pet/fall.png" },
    land: { src: "/pet/land.png", frames: 4, fps: 16 },
    held: { src: "/pet/fall.png" },
  },
  knight: { name: "Hiệp sĩ tím", say: "Tuân lệnh!", size: [47, 64], facing: 1, ...knight, held: knight.fall },
  red: { name: "Hiệp sĩ áo đỏ", say: "Xuất kích!", size: [51, 54], facing: 1, ...red, held: red.fall },
  fox: { name: "Cáo tuyết", say: "Yip yip!", size: [56, 46], facing: 1, ...fox, held: fox.fall },
  graycat: { name: "Mèo xám", say: "Meo meo!", size: [52, 56], facing: 1, ...graycat, held: graycat.fall },
  dog: { name: "Chó cam", say: "Gâu gâu!", size: [50, 56], facing: 1, ...dog, held: dog.fall },
};

// Pet đang chọn: chỉ lưu ở localStorage của trình duyệt (không lên DB). "none" = ẩn pet, mặc định là mèo.
const KEY = "pet";
const read = () => {
  try { return localStorage.getItem(KEY) || "cat"; } catch { return "cat"; }
};
const subscribe = (cb) => {
  addEventListener("pet", cb);
  addEventListener("storage", cb); // đồng bộ giữa các tab
  return () => { removeEventListener("pet", cb); removeEventListener("storage", cb); };
};
const write = (id) => {
  try { localStorage.setItem(KEY, id); } catch { /* trình duyệt chặn lưu thì chỉ mất lựa chọn sau khi tải lại */ }
  dispatchEvent(new Event("pet"));
};
export const usePet = () => [useSyncExternalStore(subscribe, read), write];
