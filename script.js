document.getElementById('searchForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const keyword = document.getElementById('keyword').value;
    const searchType = document.getElementById('searchType').value;
    const apiUrl = `https://elaws.e-gov.go.jp/api/1/lawlists/1`;

    fetch(apiUrl)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
        .then(data => {
            resultsDiv = document.getElementById('searchResults');

            resultsDiv.innerHTML = '検索中...';
            rowCount = 0
            const laws = data.getElementsByTagName('LawNameListInfo');
            if (laws.length > 0) {
                resultsDiv.innerHTML = `<b>法令検索結果</b> (ダブルクリックで法令取得)
                <table id="lawTable" border="1">
                    <thead> 
                        <tr>
                            <th>
                                法令名
                                <span class="sort-buttons">
                                    <button onclick="sortTable(0, 'asc', this)">▲</button>
                                    <button onclick="sortTable(0, 'desc', this)">▼</button>
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <!---ここにデータが入る--->
                    </tbody>
                </table>`;

                Array.from(laws).forEach(law => {
                    const title = law.getElementsByTagName('LawName')[0].textContent;
                    if (searchType === 'includes'){
                        if (title.includes(keyword)){
                            resultsDiv, rowCount = createAndAppendDiv(law, resultsDiv, rowCount);
                        }
                    } else if (searchType === 'startsWith'){
                        if (title.startsWith(keyword)){
                            resultsDiv, rowCount = createAndAppendDiv(law, resultsDiv, rowCount);
                        }
                    } else if (searchType === 'equal'){
                        if (title === keyword){
                            resultsDiv, rowCount = createAndAppendDiv(law, resultsDiv, rowCount);
                        }
                    }
                });
            } 
            if (rowCount === 0){
                resultsDiv.textContent = '該当する法令は見つかりませんでした。';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});

function createAndAppendDiv(law, resultsDiv, rowCount) {
    rowCount++;
    const title = law.getElementsByTagName('LawName')[0].textContent;
    const lawNo = law.getElementsByTagName('LawNo')[0].textContent;
    const div = document.createElement('div');
    // テーブルのtbody要素を取得
    tableBody = resultsDiv.querySelector('#lawTable tbody');

    // データをテーブルに追加
    const row = document.createElement('tr');
    row.id=lawNo;
    // 法令名のセル
    const nameCell = document.createElement('td');
    nameCell.textContent = title;
    row.appendChild(nameCell);
    
    // 法令番号のセル
    // const numberCell = document.createElement('td');
    // numberCell.textContent = lawNo;
    // row.appendChild(numberCell);
    
    // 行をテーブルに追加
    tableBody.appendChild(row);

    // ダブルクリックイベントを追加
    row.addEventListener('dblclick', function() {
        resultsDiv = fetchLawDetails(lawNo);
    });

    return resultsDiv, rowCount
};

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
                    if ((node.nodeName === 'LawTitle') || (node.nodeName === 'LawNum'))  {
                        // 処理を飛ばす
                    } else if ((node.childNodes.length > 0) && (node.nodeName != 'TOC')) {
                        if (node.nodeName.indexOf('Caption')>0){
                            html += "<br>"
                        } else if (node.nodeName.indexOf('Title')>0) {
                            html += "<br>"
                        } else if (node.nodeName.indexOf('Num')>0) {
                            html += "<br>"
                        } else if (node.nodeName === ('SupplProvision')) {
                            html += "<br>"
                        };
                        /*
                        各法令の条文に対して、「第〇条第〇項第〇号」という情報を付加していく
                        各ノードの子ノードに情報を継承させる
                        */
                        if (node.nodeName === ('MainProvision')) {
                            provision = 'MainProvision'
                            articleNo = 0
                            paragraphNo = 0
                            itemNo = 0
                        } else if (node.nodeName === ('SupplProvision')) {
                            if (node.getAttribute('AmendLawNum')){
                                suppldate = node.getAttribute('AmendLawNum')
                                console.log(suppldate)
                                provision = suppldate
                            } else {
                                provision = 'SupplProvision'
                            }
                            articleNo = 0
                            paragraphNo = 0
                            itemNo = 0
                        } else if (node.nodeName === ('Article')) {
                            if (node.getAttribute('Num') !== null) {
                                articleNo = node.getAttribute('Num')
                                paragraphNo = 0
                                itemNo = 0
                            } else {
                                articleNo = 0
                                paragraphNo = 0
                                itemNo = 0
                            }
                        } else if (node.nodeName === ('Paragraph')) {
                            if (node.getAttribute('Num') !== null) {
                                paragraphNo = node.getAttribute('Num')
                                itemNo = 0
                            } else {
                                paragraphNo = 0
                                itemNo = 0
                            }
                        } else if (node.nodeName === ('Item')) {
                            if (node.getAttribute('Num') !== null) {
                                itemNo = node.getAttribute('Num')
                            } else {
                                itemNo = 0
                            }
                        } else if (subitemNode.indexOf(node.nodeName) >=0) {
                            if (node.getAttribute('Num') !== null) {
                                itemNo += '-' + node.getAttribute('Num')
                            } else {
                                itemNo += '-' + 0
                            }
                        }
                        html += `<span class="xml-${node.nodeName}" data-article="${provision}-${articleNo}" data-item="${provision}-${articleNo}-${paragraphNo}-${itemNo}">`;
                        for (let i = 0; i < node.childNodes.length; i++) {
                            html += convertNodeToHTML(node.childNodes[i], provision, articleNo, paragraphNo, itemNo);
                        }
                        if (((node.nodeName.indexOf('Title')>0)||(node.nodeName.indexOf('Num')>0))&&(node.childNodes.length>0)){
                            html += "　"
                        }
                        html += '</span>';
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
            }
            else if (outputFrame === 'right'){
                document.getElementById('outputFrame').value = 'left';
                if (parseFloat(document.getElementById('left').style.width)>=90){
                    document.getElementById('left').style.width='50%'
                    document.getElementById('right').style.width='50%'
                }
            };

        })
};

function sortTable(columnIndex, direction, button) {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("lawTable");
    switching = true;
  
    // Clear existing active classes
    var buttons = document.querySelectorAll('.sort-buttons button');
    buttons.forEach(function(btn) {
      btn.classList.remove('active');
    });
  
    // Add active class to the clicked button
    button.classList.add('active');
  
    while (switching) {
      switching = false;
      rows = table.rows;
  
      for (i = 1; i < (rows.length - 1); i++) {
        shouldSwitch = false;
        x = rows[i].getElementsByTagName("TD")[columnIndex];
        y = rows[i + 1].getElementsByTagName("TD")[columnIndex];
  
        if (direction == "asc") {
          if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        } else if (direction == "desc") {
          if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        }
      }
      if (shouldSwitch) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      }
    }
};

// tag名が存在した場合にはそのテキストを返し、存在しない場合には''(空文字を返す関数)
function processTag(xmlDoc, tagName){
    sentence = ''
    xmlDoc.querySelectorAll(tagName).forEach(item =>{
        sentence += item.textContent
    });
    return sentence
};

// span内の文字列をコピーする処理
document.addEventListener('dblclick', function(event) {
    if (event.target.matches('.xml-Sentence')) {
        const targetElement = event.target;
        if (targetElement.closest('#left')){
            selectedElement = document.querySelector('#left')
        }
        else if (targetElement.closest('#right')){
            selectedElement = document.querySelector('#right')
        }
        console.log(selectedElement)
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

// 右クリックでspan内の文字列をコピーする処理
document.oncontextmenu = function(event){
    if (event.target.matches('.xml-Sentence')) {
        const targetElement = event.target;
        const groupValue = targetElement.getAttribute('data-article');
        const elements = document.querySelectorAll(`[data-article="${groupValue}"]`)
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

const resizer = document.querySelector('.resizer');
const leftPane = document.querySelector('.left');
const rightPane = document.querySelector('.right');

resizer.addEventListener('mousedown', (e) => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    const sidebarWidth = document.getElementById('sidebarMenu').offsetWidth 
    const sidebarVisible = document.getElementById('openSidebarMenu').checked * 1
    const containerWidth = document.querySelector('#content').offsetWidth
    const leftWidth = (e.clientX - sidebarWidth * sidebarVisible) / containerWidth * 100;
    const rightWidth = 100 - leftWidth;
    leftPane.style.width = `${leftWidth}%`;
    rightPane.style.width = `${rightWidth}%`;
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}
