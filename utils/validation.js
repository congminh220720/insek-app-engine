const emailRegexp = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const phoneRegexp = /^\d+$/;
const dateRegexp = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
const timeRegexp = /^([1-9]|([012][0-9])|(3[01]))-([0]{0,1}[1-9]|1[012])-\d\d\d\d [012]{0,1}[0-9]:[0-6][0-9]$/;

const dataRegexpByFormatYMD = /^\d{4}-\d{2}-\d{2}$/

module.exports.string = function (input, minLen, maxLen, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length >= minLen && input.length <= maxLen;
}

module.exports.email = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length >= 5 && input.length <= 126 && emailRegexp.test(input);
}

module.exports.phone = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length >= 8 && input.length <= 16 && phoneRegexp.test(input);
}

module.exports.id = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length == 20;
}

module.exports.time = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length <= 32 && timeRegexp.test(input);
}

module.exports.date = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length <= 32 && dateRegexp.test(input);
}

module.exports.dateByFormatYMD = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length <= 32 && dataRegexpByFormatYMD.test(input);
}

module.exports.password = function (input) {
  return typeof input == 'string' && input.length >= 4 && input.length <= 32;
}

module.exports.url = function (input, nullable) {
  if (!input) return nullable;
  return typeof input == 'string' && input.length <= 1024 && (input.includes('https://') || input.includes('http://'));
}

module.exports.array = function (input, minLen, maxLen) {
  if (!input) return minLen == 0;
  return Array.isArray(input) && input.length >= minLen && input.length <= maxLen;
}

module.exports.int = function (input, min, max, nullable) {
  if (input == null || input == undefined) return nullable;
  return typeof input == 'number' && input % 1 === 0 && input >= min && input <= max;
}

module.exports.float = function (input, min, max, nullable) {
  if (input == null || input == undefined) return nullable;
  return typeof input == 'number' && input >= min && input <= max;
}