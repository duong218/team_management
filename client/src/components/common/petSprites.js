// Pet dùng bộ "Cat player" của Jump Button (jumpbutton.itch.io/cat-player-asset), khung 32×32, phóng 2×.
// Giấy phép: dùng cá nhân thoải mái; dùng thương mại BẮT BUỘC ghi credit tác giả. Sửa ảnh được.
// Muốn quay lại con mèo SVG vẽ sẵn: đặt  export const SPRITES = null;
//
// Mỗi trạng thái: { src } cho ảnh/GIF, hoặc { src, frames, fps } cho sprite sheet xếp ngang 1 hàng.
// Trạng thái: sit · walk · sleep · jump · fall · land · held. Thiếu cái nào thì tự dùng cái gần nhất.
export const SPRITES = {
  size: [64, 64],
  facing: 1,
  sit: { src: "/pet/idle.png", frames: 3, fps: 3 },
  walk: { src: "/pet/walk.png", frames: 3, fps: 7 },
  sleep: { src: "/pet/sleep.png", frames: 5, fps: 2 },
  jump: { src: "/pet/jump.png" },
  fall: { src: "/pet/fall.png" },
  land: { src: "/pet/land.png", frames: 4, fps: 16 },
  held: { src: "/pet/fall.png" },
};
