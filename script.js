document.getElementById('searchForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const keyword = document.getElementById('keyword').value;
    const searchType = document.getElementById('searchType').value;
    const apiUrl = `https://elaws.e-gov.go.jp/api/1/lawlists/1`;

    fetch(apiUrl)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
        .then(data => {
            resultsDiv = document.getElementById('results');

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
                            <th>
                                法令番号
                                <span class="sort-buttons">
                                    <button onclick="sortTable(1, 'asc', this)">▲</button>
                                    <button onclick="sortTable(1, 'desc', this)">▼</button>
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
    
    // 法令名のセル
    const nameCell = document.createElement('td');
    nameCell.textContent = title;
    row.appendChild(nameCell);
    
    // 法令番号のセル
    const numberCell = document.createElement('td');
    numberCell.textContent = lawNo;
    row.appendChild(numberCell);
    
    // 行をテーブルに追加
    tableBody.appendChild(row);

    // ダブルクリックイベントを追加
    row.addEventListener('dblclick', function() {
        resultsDiv = fetchLawDetails(lawNo);
    });

    return resultsDiv, rowCount
};

function fetchLawDetails(lawNo) {
    lawTitle = document.getElementById('law-title');
    lawNum = document.getElementById('law-num');
    lawContent = document.getElementById('law-content');
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
            subitemNode = []
            for (let i=1; i<10 ;i++) {
                subitemNode.push(`Subitem${i}`)
            }
            // 再帰的にノードを解析してHTMLに変換
            const convertNodeToHTML = (node, provision = 'MainProvision', articleNo = 0, paragraphNo = 0, itemNo = 0) => {
                let html = '';

                // テキストノードの場合
                if (node.nodeType === Node.TEXT_NODE) {
                    html += node.textContent.trim();
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
                        if (node.nodeName === ('MainProvision')) {
                            provision = 'MainProvision'
                            articleNo = 0
                            paragraphNo = 0
                            itemNo = 0
                        } else if (node.nodeName === ('SupplProvision')) {
                            provision = 'SupplProvision'
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
        })

        // タブ2をアクティブにする
        const tab2Button = document.getElementById('tab2-button');
        openTab({ currentTarget: tab2Button }, 'tab2');
 
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tab1').classList.add('active');
});

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;

    tabcontent = document.getElementsByClassName('tab-content');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove('active');
    }

    tablinks = document.getElementsByClassName('tab-link');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('active');
    }

    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
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
document.addEventListener('click', function(event) {
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
    }
});