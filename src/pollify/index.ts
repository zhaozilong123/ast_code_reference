// 兼容老项目用到的nodejs10版本没有fromEntries方法
if (!Object.fromEntries) {
  Object.fromEntries = function (entries: any) {
    if (!entries || !entries[Symbol.iterator]) {
      throw new Error("Object.fromEntries() requires a single iterable argument")
    }
    let obj = {} as { [key: string]: any }
    for (let [key, value] of entries) {
      obj[key] = value
    }
    return obj
  }
}
