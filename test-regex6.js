const str1 = "------- <b>131</b>.";
const str2 = "------- 131.";
const str3 = "-------&nbsp;<strong>131</strong>.";
const str4 = "------- <span style=\"font-weight:bold\">131</span>.";

const regex = /([-_.—–]{2,})(?:\s|&nbsp;|<[^>]+>)*(?:\[|\()?(\d+)(?:<[^>]+>)?(?:\.|\]|\))?(?:<[^>]+>)?/g;

console.log(str1.replace(regex, '_______ $2.'));
console.log(str2.replace(regex, '_______ $2.'));
console.log(str3.replace(regex, '_______ $2.'));
console.log(str4.replace(regex, '_______ $2.'));
