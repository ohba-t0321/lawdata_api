function fetchLawDetails(lawNo) {
    const outputFrame = document.getElementById('outputFrame').value
    frameContent = document.getElementById(outputFrame)
    lawTitle = frameContent.getElementsByClassName('law-title')[0];
    lawNum = frameContent.getElementsByClassName('law-num')[0];
    lawContent = frameContent.getElementsByClassName('law-content')[0];
    lawTitle.innerHTML = "取得中..."
    lawNum.innerHTML = ''
    lawContent.innerHTML = '';

    const apiUrl = `https://elaws.e-gov.go.jp/api/1/lawdata/${lawNo}`; // ここに実際のAPI URLを入力
    fetch(apiUrl)
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
    .then(data => {
        lawTitle.innerHTML = data.getElementsByTagName('LawTitle')[0].innerHTML;
        lawNum.innerHTML = "(" + data.getElementsByTagName('LawNum')[0].innerHTML + ")";
        
        lawFullText = data.querySelector('LawFullText');
        // 号をさらに分割しているときのため、Subitem1,Subitem2,...Subitem10を定義しておく
        subitemNode = []
        for (let i=1; i<10 ;i++) {
            subitemNode.push(`Subitem${i}`)
        }
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
                    console.log(typeof(nName));
                    if (nName.startsWith('Table')) {
                        if (nName === 'Table'){
                            html += `<table class="lawDataTable" data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}">`
                            html += '<tbody>'
                        } else if (nName === 'TableRow'){
                            html += '<tr>'
                        } else if (nName === 'TableColumn'){
                            html += '<td>'
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
        const htmlContent = convertNodeToHTML(lawFullText);
        lawContent.innerHTML = htmlContent;
        
        if (outputFrame === 'left'){
            document.getElementById('outputFrame').value = 'right';
            if (parseFloat(document.getElementById('right').style.width)>=90){
                document.getElementById('left').style.width='50%'
                document.getElementById('right').style.width='50%'
            }
            setregex('left');
            setupHover('left');
        }
        else if (outputFrame === 'right'){
            document.getElementById('outputFrame').value = 'left';
            if (parseFloat(document.getElementById('left').style.width)>=90){
                document.getElementById('left').style.width='50%'
                document.getElementById('right').style.width='50%'
            }
            setregex('right');
            setupHover('right');
        };

    })
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
}
document.getElementById('closeButton').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('reference').style.opacity = 0;
    document.getElementById('reference').style.zIndex = 0;
});
// span内の文字列をダブルクリックでコピーする処理
// 処理を凍結
/*
document.addEventListener('dblclick', function(event) {
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
});
*/

// tag名が存在した場合にはそのテキストを返し、存在しない場合には''(空文字を返す関数)
// 使っているところがないが念のため残しておく
function processTag(xmlDoc, tagName){
    sentence = ''
    xmlDoc.querySelectorAll(tagName).forEach(item =>{
        sentence += item.textContent
    });
    return sentence
};