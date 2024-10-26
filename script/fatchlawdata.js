// 号をさらに分割しているときのため、Subitem1,Subitem2,...Subitem10を定義しておく
subitemNode = []
for (let i=1; i<10 ;i++) {
    subitemNode.push(`Subitem${i}`)
}

async function fetchLawDetails(lawNo) {
    const outputFrame = document.getElementById('outputFrame').value
    frameContent = document.getElementById(outputFrame)
    lawTitle = frameContent.getElementsByClassName('law-title')[0];
    lawNum = frameContent.getElementsByClassName('law-num')[0];
    lawContent = frameContent.getElementsByClassName('law-content')[0];
    lawTitle.innerHTML = "取得中..."
    lawNum.innerHTML = ''
    lawContent.innerHTML = '';

    if (outputFrame === 'left'){
        document.getElementById('outputFrame').value = 'right';
        if (parseFloat(document.getElementById('right').style.width)>=90){
            document.getElementById('left').style.width='50%'
            document.getElementById('right').style.width='50%'
        }
    }
    else if (outputFrame === 'right'){
        document.getElementById('outputFrame').value = 'left';
        if (parseFloat(document.getElementById('left').style.width)>=90){
            document.getElementById('left').style.width='50%'
            document.getElementById('right').style.width='50%'
        }
    };

    const apiUrl = `https://laws.e-gov.go.jp/api/1/lawdata/${lawNo}`; // ここに実際のAPI URLを入力
    response = await fetch(apiUrl)
    str = await response.text()
    data = new window.DOMParser().parseFromString(str, "application/xml")
    lawTitle.innerHTML = data.getElementsByTagName('LawTitle')[0].innerHTML;
    lawNum.innerHTML =  "(" + data.getElementsByTagName('LawNum')[0].innerHTML + ")";
    
    lawFullText = data.querySelector('LawFullText');
    
    // 再帰的にノードを解析してHTMLに変換
    const convertNodeToHTML = (node, provision = 'MainProvision', articleNo = 0, paragraphNo = 0, itemNo = 0) => {
        let html = '';

        // テキストノードの場合
        if (node.nodeType === Node.TEXT_NODE) {
            // 「附則」の文字に改正法令の情報を付加する
            if ((provision !='MainProvision')&&(provision !='SupplProvision')){
                if (node.textContent.replace(/\s/g,'')==='附則'){
                    html += node.textContent.trim() + '(' + provision + ')';    
                } else {
                    html += node.textContent.trim();
                }
            } else {
                html += node.textContent.trim();
            }
        }
        // エレメントノードの場合
        if (node.nodeType === Node.ELEMENT_NODE) {
            const nName = node.nodeName
            if (node.childNodes.length === 0){
                // ノードが'ParagraphNum'の場合、そのノードを遡って'Article'のノードを見に行き、その中のArticleTitleを探す
                if (nName ==='ParagraphNum'){
                    articleNode = node.closest('Article')
                    if (articleNode){
                        articleTitle = articleNode.getElementsByTagName('ArticleTitle')[0]
                        if (articleTitle){
                            html += `<span class="xml-ParagraphNum data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}">`;
                            html += articleTitle.innerHTML
                            html += '</span>　'
                        }
                    } 
                }
            } else if ((nName != 'LawTitle') && (nName != 'LawNum') && (nName != 'TOC')) {
                /*
                各法令の条文に対して、「第〇条第〇項第〇号」という情報を付加していく
                各ノードの子ノードに情報を継承させる
                */
                if (nName === ('MainProvision')) {
                    provision = 'MainProvision'
                    articleNo = 0
                    paragraphNo = 0
                    itemNo = 0
                } else if (nName === ('SupplProvision')) {
                    html += "<br>"
                    if (node.getAttribute('AmendLawNum')){
                        suppldate = node.getAttribute('AmendLawNum')
                        provision = suppldate
                    } else {
                        provision = 'SupplProvision'
                    }
                    articleNo = 0
                    paragraphNo = 0
                    itemNo = 0
                } else if (nName === ('Article')) {
                    // 通常、アトリビュートとしてNumが含まれるはずだが、もしなかった場合には0で補完する
                    if (node.getAttribute('Num')) {
                        articleNo = node.getAttribute('Num')
                    } else {
                        articleNo = 0
                    }
                    paragraphNo = 0
                    itemNo = 0
                } else if (nName === ('Paragraph')) {
                    // 通常、アトリビュートとしてNumが含まれるはずだが、もしなかった場合には0で補完する
                    if (node.getAttribute('Num')) {
                        paragraphNo = node.getAttribute('Num')
                    } else {
                        paragraphNo = 0
                    }
                    itemNo = 0
                } else if (nName === ('Item')) {
                    // 通常、アトリビュートとしてNumが含まれるはずだが、もしなかった場合には0で補完する
                    if (node.getAttribute('Num')) {
                        itemNo = node.getAttribute('Num')
                    } else {
                        itemNo = 0
                    }
                } else if (subitemNode.indexOf(nName) >=0) {
                    // 通常、アトリビュートとしてNumが含まれるはずだが、もしなかった場合には0で補完する
                    if (node.getAttribute('Num')) {
                        itemNo += '-' + node.getAttribute('Num')
                    } else {
                        itemNo += '-' + 0
                    }
                }
                if (nName.startsWith('Table')) {
                    if (nName === 'Table'){
                        html += `<table class="lawDataTable" data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}">`
                        html += '<tbody>'
                    } else if (nName === 'TableRow'){
                        html += '<tr>'
                    } else if (nName === 'TableColumn'){
                        html += '<td'
                        const attr = node.attributes;
                        for (let i = 0; i < attr.length; i++) {
                            // 属性名と値を付加
                            html += ' ';
                            html += attr[i].name;
                            html += '=';
                            html += attr[i].value;
                          }
                          
                        html += '>'
                    } else {
                        html += `<span class="xml-${nName}">`
                    }
                } else {
                    html += `<span class="xml-${nName}" data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}">`;
                }

                for (let i = 0; i < node.childNodes.length; i++) {
                    if (nName!='ArticleTitle') {
                        html += convertNodeToHTML(node.childNodes[i], provision, articleNo, paragraphNo, itemNo);
                    }
                }
                if (((nName.indexOf('Title')>0)||(nName.indexOf('Num')>0))&&(node.childNodes.length>0)){
                    html += "　"
                }
                if ((nName.indexOf('Column')>=0)&&(node.getAttribute('Num'))&&(node.childNodes.length>0)){
                    html += "　"
                }
                if (nName.startsWith('Table')) {
                    if (nName === 'Table'){
                        html += '</tbody>'
                        html += `</table>`
                    } else if (nName === 'TableRow'){
                        html += '</tr>'
                    } else if (nName === 'TableColumn'){
                        html += '</td>'
                    } else {
                        html += `</span>`
                    }
                } else {
                    html += '</span>';
                }
            }
        }
        return html;
    };

    // ルートノードから開始してHTMLに変換
    lawContent.innerHTML = convertNodeToHTML(lawFullText);
    

    // searchResults.forEach(lawNum => {
    //     setupHover(outputFrame, synonym, lawNum);
    // });
    annotation(outputFrame);
    // すべてのセクションを監視対象として登録
    document.querySelectorAll('.xml-Sentence').forEach(sentence => {
        observer.observe(sentence);
    });
    setupHover_reference(outputFrame);
};
// 右クリックでspan内の文字列をコピーする処理
document.oncontextmenu = function(event){
    if (event.target.matches('.xml-Sentence')) {
        const targetElement = event.target;
        if (targetElement.closest('#left')){
            selectedElement = document.querySelector('#left')
        }
        else if (targetElement.closest('#right')){
            selectedElement = document.querySelector('#right')
        }
        const groupValue = targetElement.getAttribute('data-article');
        const elements = selectedElement.querySelectorAll(`[data-article="${groupValue}"]`)
        let text = ''
        elements.forEach(element=> {
            // xml-Articleのデータは一番外側のデータなので、当該データが抽出できれば十分。
            if (element.className === 'xml-Article'){
                text += element.innerText
            }
        });
        navigator.clipboard.writeText(text).then(() => {
            alert('テキストがコピーされました: ' + text);
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
        });
        return false;
    }
};

document.getElementById('closeButton').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('reference').style.opacity = 0;
    document.getElementById('reference').style.zIndex = 0;
});

// IntersectionObserverのコールバック関数
const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // 他の法令への引用を付加
            sentence = entry.target;
            if (sentence.closest('.left')){
                outputFrame = 'left';
            }
            else if (sentence.closest('.right')) {
                outputFrame = 'right';
            }
            else {
                outputFrame = undefined;
            }
            if (outputFrame){
                const value1 = setregex(outputFrame);
                const searchResults = value1.searchResults;
                const synonym = value1.synonym;
                // 要素がビューポートに入ったらリンクを付与
                searchResults.forEach(lawNum => {
                    setupHover(sentence, synonym, lawNum);
                });
            }
            // 1度リンクを付与したら監視を解除する
            observer.unobserve(entry.target);
        }
    });
};

// IntersectionObserverのオプション
const options = {
    root: null, // ビューポートがroot
    rootMargin: '0px',
    threshold: 0.1 // 要素が50%以上表示されたときに検知
};

// IntersectionObserverを作成
const observer = new IntersectionObserver(observerCallback, options);

