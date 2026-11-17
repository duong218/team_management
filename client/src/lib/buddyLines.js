// Câu thoại của bé mèo ở góc sidebar. BANDS: [giờ bắt đầu, các câu]; lấy khung cuối cùng có giờ bắt đầu <= giờ hiện tại (16.5 = 16h30).
const NIGHT = ["Khuya lắm rồi, đi ngủ thôi bạn iu, mai làm tiếp cũng được.", "Thức khuya hại da lắm đó, nghỉ đi nha."];
const BANDS = [
  [0, NIGHT],
  [5, ["Dậy sớm thế bạn iu! Ngày mới cứ nhẹ nhàng thôi nha.", "Sớm tinh mơ luôn, bạn nhỏ chăm quá đi."]],
  [6, ["Hello bạn nhỏ, buổi sáng vui vẻ nhá!", "Chào buổi sáng! Nhớ ăn sáng trước khi cày việc nha.", "Ngày mới rồi, mình cùng làm từng việc một thôi."]],
  [9, ["Đầu giờ làm rồi, cố lên bạn iu, từng task một thôi.", "Cà phê chưa bạn iu? Có rồi thì mình làm thôi nào!"]],
  [11, ["Sắp tới giờ nghỉ trưa rồi, xong việc này mình đi ăn nha.", "Bụng đói chưa bạn iu? Làm nốt chút rồi ăn thôi."]],
  [13, ["Chiều tốt lành! No bụng rồi, mình làm tiếp thôi nào.", "Buồn ngủ hả? Uống ngụm nước cho tỉnh nè."]],
  [14, ["Chiều rồi, cố thêm chút nữa là xong ngày.", "Bạn làm tốt lắm đó, tiếp tục nha."]],
  [16.5, ["Hết giờ làm rồi đó, xong việc nhớ nghỉ ngơi nha.", "Hôm nay bạn vất vả rồi, giỏi lắm."]],
  [19, ["Tối rồi mà vẫn làm, giỏi ghê, nhưng đừng thức khuya nha.", "Tối rồi, làm nốt việc này thôi nha, đừng ôm hết một mình."]],
  [22, NIGHT],
];
export const BREAK = ["Nghỉ tay một lát cho đỡ mệt nha, đừng làm quá sức đó.", "Đứng dậy vươn vai cái nào, rồi uống ngụm nước nữa nha.", "Mắt mỏi rồi đó, nhìn ra xa 20 giây cho đỡ nhức nha."];
export const LUNCH = ["Chuẩn bị nghỉ trưa thôi bạn iu, lấy sức chiều làm tiếp nha.", "Lưu việc lại, đi ăn cơm thôi, việc không chạy đâu mất!"];
const hour = (d) => d.getHours() + d.getMinutes() / 60;
export const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
export const greetLine = (d = new Date(), r) => pick(BANDS.findLast(([from]) => from <= hour(d))[1], r);
export const inLunch = (d = new Date()) => hour(d) >= 10.5 && hour(d) < 13;
