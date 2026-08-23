const str = "------- <b>131</b>.";
const regex = /([-_.—–]{2,})(?:\s|&nbsp;)*(?:\[|\()?(\d+)(?:\.|\]|\))?/g;
console.log(str.replace(regex, '_______ $2.'));
