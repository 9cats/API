/* 获取当前时间 */
function getCurTime() {
  let time = new Date(); //北京时间
  return time.toLocaleString();
}

module.exports = {getCurTime};