var searchResults = new Set();
var searchText = {};


refJson = [
    {'ref':{'lawNum':'昭和二十三年法律第百七十八号','lawArticle':{'Provision':'MainProvision','article':'2','paragraph':'1'},'words':'政令で定める日'},
    'referred':{'lawNum':'昭和四十一年政令第三百七十六号','lawArticle':{'paragraph':'1'}}}
]

// JSONをkey1=value1,key2=value2,...の形に変換する関数
function jsonToString(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
}

// 漢数字を算用数字に直す関数
function kanjiToNumber(kanji) {
    const kanjiMap = {
        '〇': 0,
        '一': 1,
        '二': 2,
        '三': 3,
        '四': 4,
        '五': 5,
        '六': 6,
        '七': 7,
        '八': 8,
        '九': 9,
        '十': 10,
        '百': 100,
        '千': 1000,
        '万': 10000,
        '億': 100000000,
        '兆': 1000000000000,
    };

    let result = 0;
    let temp = 0;
    let temp_10000 = 0; // 万以上の単位が出てきた時のために、万、億…の数字を記憶しておく
    let currentMultiplier = 1; // 十、百、千を記憶しておく（以降、位数と表記）
    let baseMultiplier = 1; // 万（将来的には億、兆、京）が出てきた場合に記憶しておく

    for (let i = kanji.length - 1; i >= 0; i--) {
        const char = kanji[i];
        const value = kanjiMap[char];

        if (value >=10000) {
            if (currentMultiplier>1) {
                // currentMultiplierが1出ないときは、千百、百十のように位数が連続して「一」が省略されている。
                temp_10000 += currentMultiplier
                // 位数を初期化するほうがわかりやすいが次の処理で上書きするので省略
            }
            temp += temp_10000 * baseMultiplier // 万が出てきた時は九千九百九十九までを、億が出てきた時は万の部分…を記憶
            baseMultiplier = value;
            currentMultiplier = 1;
            temp_10000 = 0;
        } else if (value >=10) {
            if (currentMultiplier>1) {
                // currentMultiplierが1出ないときは、千百、百十のように位数が連続して「一」が省略されている。
                temp_10000 += currentMultiplier
                // 位数を初期化するほうがわかりやすいが次の処理で上書きするので省略
            }
            currentMultiplier = value;
        } else {
            // 一～九の数字が出てきた場合、1つ前の位数と掛け合わせる
            temp_10000 += value * currentMultiplier
            currentMultiplier = 1 // 位数を初期化
        }
    }
    // 万が出てきた時は九千九百九十九までを、億が出てきた時は万の部分…を記憶
    // 最上位の位は処理できていないので最後に処理する
    if (currentMultiplier>1) {
        temp_10000 += currentMultiplier
    }
    temp += temp_10000 * baseMultiplier 
    return temp;
}

function setregex(){
    const lawTextElement = document.getElementById('law-content-left').innerHTML;
    const regex = /（((令和|平成|昭和|大正|明治)([一二三四五六七八九十]+)年(法律|政令|省令|内閣府令)第([一二三四五六七八九十百千万]+)号)）/g;
    while ((match = regex.exec(lawTextElement)) !== null) {
        searchResults.add(match[1]);
    };
};

// Function to set up hover functionality
function setupHover() {
    const lawTextElement = document.getElementById('law-content-left');
    const framelawNum = document.getElementById('law-num-left').innerHTML.replace('(','').replace(')','')

    // idを格納するためのセットを作成
    const lawNumSet = new Set();

    // JSONデータをループしてidをセットに追加
    refJson.forEach(item => {
        if (item.ref.lawNum !== undefined) {
            lawNumSet.add(item.ref.lawNum);
        }
    });
    // セットをリストに変換
    const lawNumList = Array.from(lawNumSet);
    if (lawNumList.includes(framelawNum)) {
        refJson.forEach(ref => {
            const words = ref.ref.words;
            const lawNum = ref.referred.lawNum;
            const lawArticle = ref.referred.lawArticle;
            const lawTextHTML = lawTextElement.innerHTML;

            const apiUrl = `https://elaws.e-gov.go.jp/api/1/articles;lawNum=${lawNum};${jsonToString(lawArticle)}`; // ここに実際のAPI URLを入力
            fetch(apiUrl)
            .then(response => response.text())
            .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
            .then(data => {
                textdata = ''
                data.querySelectorAll('Sentence').forEach(selector =>{
                    textdata += selector.innerHTML
                });
                lawTextElement.innerHTML = lawTextHTML.replace(words, `<span class="hovered" data-popup="${lawNum} 第${lawArticle.Paragraph}条" popup-text="${textdata}">${words}</span>`);
                
            });    
        });
    }

    searchResults.forEach(lawNum => {
        const regex = new RegExp(xmlData[lawNum] + '(（' + lawNum + '）)?第([一二三四五六七八九十百千万]+)条(の([一二三四五六七八九十百千万]+))?(第([一二三四五六七八九十百千万]+)項)?' , 'g');
        while ((match = regex.exec(lawTextElement.innerHTML)) !== null){
            const lawArticleParagraph = match[0]
            const lawArticle = match[2]
            const lawArticleSub = match[4]
            const lawParagraph = match[6] 
            // match[0]:マッチした部分全体
            // match[2]:条
            // match[4]:条の～　の～部分
            // match[6]:項

            const apiUrl = `https://elaws.e-gov.go.jp/api/1/articles;lawNum=${lawNum};${match[2]?'article='+kanjiToNumber(match[2]):''}${match[4]? '_'+ kanjiToNumber(match[4]) : ''}${match[6]? ';paragraph='+ kanjiToNumber(match[6]):''}`; // ここに実際のAPI URLを入力
            fetch(apiUrl)
            .then(response => response.text())
            .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
            .then(data => {
                textdata = ''
                data.querySelectorAll('Sentence').forEach(selector =>{
                    textdata += selector.innerHTML
                });
                searchText[apiUrl] = textdata
                // console.log(`<span class="hovered" data-popup="${lawNum}" popup-text="${textdata}">${lawArticleParagraph}</span>`)
                lawTextElement.innerHTML = lawTextElement.innerHTML.replaceAll(lawArticleParagraph, `<span class="hovered" data-popup="${lawNum}" popup-text="${textdata}">${lawArticleParagraph}</span>`);
            })
            .catch(error => {
                console.log(`error!`)
                console.error('Error fetching XML data:', error);
            });
        }
    });
};