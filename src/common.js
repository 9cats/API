module.exports = {
  Success(msg) {
    return {
      success: true,
      message: msg
    }
  },

  Fail(msg, e) {
    console.log(msg, e);
    return {
      success: false,
      message: msg,
      error: e
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
  }
}