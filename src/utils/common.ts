// Hàm này sẽ là hàm biến hàm enum thành 1 array để tiện cho việc validator isIn của expressJS
export const numberEnumToArray = (numberEnum: { [key: string]: string | number }) => {
  // Cấu hình cho key có kiểu là string và value có kiểu là string or number
  // Object.values: Lấy ra toàn bộ value trong obj đó và tập hợp lại thành 1 mảng
  // .filter: check xem trong arr value đó nếu đúng với điều kiện được return, nó sẽ thêm vào 1 mảng => check typeof
  // as number[]: để chắc chắn hơn hàm trả về sẽ toàn là 1 mảng kiểu number
  return Object.values(numberEnum).filter((value) => typeof value === 'number') as number[]
}
