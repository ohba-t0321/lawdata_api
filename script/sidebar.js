function toggleContent(element) {
    let wrapper = element.nextElementSibling;
    let arrow = element.querySelector(".arrow");

    if (!wrapper.classList.contains("open")) {
        wrapper.classList.add("open");
        arrow.textContent = "▼"; // 開く
    } else {
        wrapper.classList.remove("open");
        arrow.textContent = "▶"; // 閉じる
    }
}
document.getElementById('searchButton').addEventListener('click', function(event) {
    event.preventDefault();
    const keyword = document.getElementById('keyword').value;
    const searchType = document.getElementById('searchType').value;
    const apiUrl = `https://elaws.e-gov.go.jp/api/1/lawlists/1`;

    const params = new URLSearchParams(window.location.search);
    const encodedKeyword = encodeURIComponent(keyword);
    params.set("keyword", encodedKeyword);
    params.set("searchType", searchType);
    // URLを書き換え（履歴に追加）
    window.history.pushState({}, "", "?" + params.toString());
    fetch(apiUrl)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
        .then(data => {
            const resultsDiv = document.getElementById('searchResults');

            resultsDiv.innerHTML = '検索中...';
            lawFound = false;
            const laws = data.getElementsByTagName('LawNameListInfo');
            if (laws.length > 0) {
                resultsDiv.innerHTML = `<b>法令検索結果</b> (ダブルクリックで法令取得)
                <table id="lawTable" border="1">
                    <thead> 
                        <tr>
                            <th>
                                法令名
                                <span class="sort-buttons">
                                    <button id="sort-asc" onclick="sortTable(0, 'asc', this)">▲</button>
                                    <button id="sort-desc" onclick="sortTable(0, 'desc', this)">▼</button>
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
                    if (((searchType === 'includes')&&(title.includes(keyword)))||((searchType === 'startsWith')&&(title.startsWith(keyword)))||((searchType === 'equal')&&(title === keyword))){
                        createAndAppendDiv(law, resultsDiv);
                        lawFound = true;
                    }
                });
            } 
            if (!(lawFound)){
                resultsDiv.textContent = '該当する法令は見つかりませんでした。';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});
function createAndAppendDiv(law, resultsDiv) {
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
    // 行をテーブルに追加
    tableBody.appendChild(row);

    // ダブルクリックイベントを追加
    row.addEventListener('dblclick', async function() {
        const outputFrame = document.getElementById('outputFrame').value;
        const params = new URLSearchParams(window.location.search);
        const encodedlawNo = encodeURIComponent(lawNo);
        params.set(outputFrame, encodedlawNo);
        // URLを書き換え（履歴に追加）
        window.history.pushState({}, "", "?" + params.toString());
        await fetchLawDetails(lawNo, outputFrame);
    });
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
document.getElementById('jumpButton').addEventListener('click', function(event) {
    event.preventDefault();
    const jumpArticle = document.getElementById('jumpArticle').value;
    if (jumpArticle === '') {
        return;
    }
    else {
        article = '';
        // 数字が入力された場合にはそのまま使う
        if (Number(jumpArticle)) {
            article = jumpArticle;
        } else {
            const regex = /第(\d+|[一二三四五六七八九十百千]+)条(の[\d一二三四五六七八九十百千]+)*/g
            matches = [...jumpArticle.matchAll(regex)];
            if (matches[0][1]) {
                article = kanjiToNumber(matches[0][1]);
                if (matches[0][2]) {
                    // 'の'ごとで区切る
                    subarticle = matches[0][2].split('の').map(kanjiToNumber).join('_');
                    article += subarticle;
                }
            }
        }
        if (article) {
            jumpFrame = document.getElementById("right-jump");
            if (jumpFrame.classList.contains("active")) {
                frame = document.getElementById('right')
            } else {
                frame = document.getElementById('left')
            }
            frame.querySelector('[data-article="MainProvision-' + article + '"]').scrollIntoView({behavior: "smooth", block: "nearest"});
        }
    }
});

// clearwindow内の「左側」「右側」ボタンをクリックした時の処理
const clearwindow = document.getElementById('clearwindow');
const clearbuttons = clearwindow.querySelectorAll('.btn-outline-secondary');

clearbuttons.forEach(button => {
    button.addEventListener('click', function(event) {
        event.preventDefault();
        // クリックしたボタンによってフレームを定義。left,rightのみのはずだが例外が出てきた時を考慮して''を規定
        if (button.id === 'left-clear') {
            flamename = 'left';
        } else if (button.id === 'right-clear') {
            flamename = 'right';
            document.getElementById('left').style.width = '99%'
            document.getElementById('right').style.width = '1%'
        } else {
            flamename = 'dummydummy';
        }
        flame = document.getElementsByClassName(flamename)[0]
        if (flame) {
            flame.getElementsByClassName('law-title')[0].innerHTML=''
            flame.getElementsByClassName('law-num')[0].innerHTML=''
            flame.getElementsByClassName('law-content')[0].innerHTML=''
        }
    });
});

// jumpForm内の「左側」「右側」ボタンをクリックした時の処理
const jumpForm = document.getElementById('jumpForm');
const jumpbuttons = jumpForm.querySelectorAll('.btn-outline-secondary');

jumpbuttons.forEach(button => {
    button.addEventListener('click', function(event) {
        event.preventDefault();
        // クリックしたボタンによってフレームを定義。left,rightのみのはずだが例外が出てきた時を考慮して''を規定
        if (button.id === 'left-jump') {
            flamename = 'left';
            deactivateButton = document.getElementById('right-jump')
            deactivateButton.classList.remove("active");
        } else if (button.id === 'right-jump') {
            flamename = 'right';
            deactivateButton = document.getElementById('left-jump')
            deactivateButton.classList.remove("active");
        } else {
            flamename = 'dummydummy';
        }
    });
});