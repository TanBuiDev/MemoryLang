const html = "<p>------- 131.</p><p>_______ 132.</p><p>....... 133</p>";
const regex = /([_\-.]{3,})\s*(?:\[|\()?(\d+)(?:\.|\]|\))?/g;
console.log(html.replace(regex, '_______ $2.'));
