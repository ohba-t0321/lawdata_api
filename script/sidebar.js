document.getElementById('searchButton').addEventListener('click', function(event) {
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

const clearbuttons = document.querySelectorAll('.btn-outline-secondary');

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
