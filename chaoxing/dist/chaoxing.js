const {ChaoXing} = require("../lib/client")

module.exports = {
  /* 创建客户端 */
  agent: (account, password) => {
    return new ChaoXing(account, password);
  }
}