const html1 = "------- 131.";
const html2 = "-------&nbsp;131.";
const html3 = "-------  131.";
const html4 = "— 131.";
const html5 = "– 131.";
const html6 = "-------131";

const regex = /([-_.—–]{2,})(?:\s|&nbsp;)*(?:\[|\()?(\d+)(?:\.|\]|\))?/g;

console.log(html1.replace(regex, '_______ $2.'));
console.log(html2.replace(regex, '_______ $2.'));
console.log(html3.replace(regex, '_______ $2.'));
console.log(html4.replace(regex, '_______ $2.'));
console.log(html5.replace(regex, '_______ $2.'));
console.log(html6.replace(regex, '_______ $2.'));
