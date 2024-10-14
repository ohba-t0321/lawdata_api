const root = document.documentElement;

async function annotation(left_right){
    const lawTextElement = document.getElementById('law-content-' + left_right);
    const elements = lawTextElement.querySelectorAll('.xml-Sentence');
    // 各要素について処理
    elements.forEach(element => {
        element.innerHTML = element.innerHTML.replace(/（[^（）]*?）/g, function(match) {
          return '<span class="annotation">' + match + '</span>';
        });
      });
}

document.getElementById('annotate_normal').addEventListener('click', function(event) {
    root.style.setProperty("--annotate-color", "#000");
    root.style.setProperty("--annotate-display", "initial");
});

document.getElementById('annotate_gray').addEventListener('click', function(event) {
    root.style.setProperty("--annotate-color", "#ccc");
    root.style.setProperty("--annotate-display", "initial");
});

document.getElementById('annotate_none').addEventListener('click', function(event) {
    root.style.setProperty("--annotate-color", "#fff");
    root.style.setProperty("--annotate-display", "none");
});
