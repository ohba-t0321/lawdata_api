const root = document.documentElement;

async function annotation(left_right){
    const lawTextElement = document.getElementById('law-content-' + left_right);
    const elements = lawTextElement.querySelectorAll('.xml-Sentence');
    // 各要素について処理
    elements.forEach(element => {
        const inputText = element.textContent;
        const isBalanced = checkParenthesesBalance(inputText);
    
        if (isBalanced) {
            element.innerHTML = colorizeParentheses(element.innerHTML);
        } else {
            // console.log(`『${inputText}』はカッコが対応していないので色分け不能`)
        }
    });
}

const colors = ['#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd'];

// カッコの色分け
function colorizeParentheses(text) {
    let depth = 0;
    return text.replace(/(（|）|「|」)/g, (match) => {
        if (match === "（" || (match === "「")) {
            depth++;
            return `<span class='annotation lv${((depth-1) % 5)+1}'>${match}`;
        } else if ((match === "）") || (match === "」")) {
            depth--;
            return `${match}</span>`;
        }
    });
}

// カッコの一致を確認
function checkParenthesesBalance(text) {
    const stack = [];
    for (let char of text) {
        if ((char === "（") || (char === "「")) {
            stack.push(char);
        } else if (char === "）") {
            if (stack.length === 0) {
                return false; // 開きカッコが不足している
            } else if (stack[stack.length-1] !=="（"){
                return false; // カッコの対応が不一致
            }
            stack.pop();
        } else if (char === "」") {
            if (stack.length === 0) {
                return false; // 開きカッコが不足している
            } else if (stack[stack.length-1] !=="「"){
                return false; // カッコの対応が不一致
            }
            stack.pop();
        }
    }
    return stack.length === 0; // 最後にスタックが空なら一致している
}

document.getElementById('annotate_normal').addEventListener('click', function(event) {
    for (i = 1 ; i<=5; i++){
        root.style.setProperty(`--annotate-color-lv${i}`, "#000");
    }
    root.style.setProperty("--annotate-display", "initial");
});

document.getElementById('annotate_gray').addEventListener('click', function(event) {
    for (i = 1 ; i<=5; i++){
        root.style.setProperty(`--annotate-color-lv${i}`, colors[i-1]);
    }
    root.style.setProperty("--annotate-display", "initial");
});

document.getElementById('annotate_none').addEventListener('click', function(event) {
    root.style.setProperty("--annotate-color", "#fff");
    root.style.setProperty("--annotate-display", "none");
});
