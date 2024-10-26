var searchText = {};

refJson = [
    {'referred':{'lawNum':'昭和二十三年法律第百七十八号','lawArticle':{'Provision':'MainProvision','article':'2','paragraph':'1'},'words':'政令で定める日'},
    'ref':{'lawNum':'昭和四十一年政令第三百七十六号','lawArticle':{'paragraph':'1'}}}
]

// JSONをkey1=value1 key2=value2 ...の形に変換する関数
function jsonToString(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
}

// 漢数字を算用数字に直す関数
function kanjiToNumber(kanji) {
    if (kanji){
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
    } else {
        return undefined;
    }
};

function setregex(left_right){
    const searchResults = new Set();
    const synonym = {};
    const lawTextElement = document.getElementById('law-content-' + left_right).innerHTML;
    const regex = /(?<=（)((?:令和|平成|昭和|大正|明治)[一二三四五六七八九十]+年(?:法律|政令|省令|内閣府令)第[一二三四五六七八九十百千万]+号)(?:。以下「(.*?)」という。)?(?=）)/g;
    while ((match = regex.exec(lawTextElement)) !== null) {
        if (match[1]){
            searchResults.add(match[1]);
            if (match[2]){
                synonym[match[1]] = match[2];
            }
        }
    };
    searchResults.forEach(lawNum => {
        /*
        法令の参照では以下の記述となっていることが多いので、正規表現で該当するところを取得した。
        [法令名が初めて現れる場合]：(法令名)（元号○○年法律/政令/...第○号）第○条第○項
        [法令名が初めて現れる場合で、法令を省略する場合](法令名)（元号○○年法律/政令/...第○号。以下「○○法」という。）第○条第○項
        [法令名が2回目以降の場合](法令名もしくは略称名)第○条第○項
        なお、「第○条」のところは「第○条の○」となるケースもあるため、それに対応している
        法律によっては第○条の○条の○…と続くことがあるが、それは対応が難しいので非対応
        */
        const synonymRegex = new RegExp(xmlData[lawNum] + '(?:<span class="annotation">)?（以下「(.*?)」という。）(?:</span>)?' , 'g');
        while ((match = synonymRegex.exec(lawTextElement)) !== null) {
            if (match[1]){
                if (!(synonym[lawNum])){ //附則で改正法令によって上書きしていることがあるため、最初に出てきたものを優先する
                    synonym[lawNum] = match[1];
                }
            }
        }
    });

    // searchResultsをソート
    const sortedResults = Array.from(searchResults).sort((a, b) => {
        const nameA = synonym[a] || xmlData[a] || 1;  // 法令番号がxmlDataに存在しない場合、1とする
        const nameB = synonym[b] || xmlData[b] || 1;
        return nameB.length - nameA.length;  // 長さでソート（降順）
    });
    return {
        searchResults: sortedResults, 
        synonym: synonym};
};

// Function to set up hover functionality
async function setupHover(lawTextElement, synonym, lawNum) {
    // const lawTextElement = document.getElementById('law-content-' + left_right);
    // const framelawNum = document.getElementById('law-num-' + left_right).innerHTML.replace('(','').replace(')','')

    // // idを格納するためのセットを作成
    // const lawNumSet = new Set();

    // // JSONデータをループしてidをセットに追加
    // refJson.forEach(item => {
    //     if (item.referred.lawNum !== undefined) {
    //         lawNumSet.add(item.referred.lawNum);
    //     }
    // });
    // // セットをリストに変換
    // const lawNumList = Array.from(lawNumSet);
    // if (lawNumList.includes(framelawNum)) {
    //     refJson.forEach(refdata => {
    //         const words = refdata.referred.words;
    //         const lawNum = refdata.ref.lawNum;
    //         const lawArticle = refdata.ref.lawArticle;

    //         const apiUrl = `https://elaws.e-gov.go.jp/api/1/articles;lawNum=${lawNum};${jsonToString(lawArticle)}`; // ここに実際のAPI URLを入力
    //         fetch(apiUrl)
    //         .then(response => response.text())
    //         .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
    //         .then(data => {
    //             textdata = ''
    //             data.querySelectorAll('Sentence').forEach(selector =>{
    //                 textdata += selector.innerHTML
    //             });
    //             lawTextElement.innerHTML = lawTextElement.innerHTML.replace(words, `<span class="hovered" data-popup="${lawNum} 第${lawArticle.Paragraph}条" popup-text="">${words}</span>`);
                
    //         });    
    //     });
    // }
    const regex = new RegExp('(?:' + xmlData[lawNum] + (synonym[lawNum]? '|' + synonym[lawNum] : '') + ')' + '(?:<span class="annotation">（(?:' + lawNum + ')?。?(?:以下「[^「]*?」という。)?）</span>)?第([一二三四五六七八九十百千万]+)条(?:の([一二三四五六七八九十百千万]+))?(?:第([一二三四五六七八九十百千万]+)項)?' , 'g');
    const newHTML = lawTextElement.innerHTML.replaceAll(regex,(match, lawArticleNum, lawArticleSubNum, lawParagraphNum) =>{
        lawArticleNum = kanjiToNumber(lawArticleNum);
        lawArticleSubNum = kanjiToNumber(lawArticleSubNum);
        lawParagraphNum = kanjiToNumber(lawParagraphNum);
        const lawData = `lawNum=${lawNum} ${lawArticleNum?'article='+lawArticleNum:''}${lawArticleSubNum? '_'+ lawArticleSubNum : ''}${lawParagraphNum? ' paragraph='+ lawParagraphNum: ''}`
        // return `<span class="hovered" ${lawData}><span data-lawnum=${lawNum}>${lawName}</span>${match_rest}</span>`;
        return `<span class="hovered" ${lawData}>${match}</span>`;
    });
    lawTextElement.innerHTML = newHTML;
    hovered = lawTextElement.querySelectorAll('.hovered');
    hovered.forEach(itm=>{
        setupLink(itm);
    });
}

async function setupHover_reference(outputFrame) {
    const lawTextElement = document.getElementById('law-content-' + outputFrame);

    const framelawNum = document.getElementById('law-num-' + outputFrame).innerHTML.replace('(','').replace(')','')
    const file = './ref_json/' + framelawNum + '.json';
    fetch(file).then(response => response.json())
        .then(data => {

            data.forEach(item => {
                referredJson = item.referred.lawArticle;
                referredNum = referredJson.provision + '-' + referredJson.article + '-' + referredJson.paragraph + '-' + referredJson.item;
                refJson = item.ref.lawArticle;
                const words = item.match;
                const lawData = `lawNum=${item.ref.lawNum}${refJson.article!='0'?' article='+refJson.article:''}${' paragraph='+ refJson.paragraph}${refJson.item!=0?' item='+refJson.item:''}`
                linkSentences = lawTextElement.querySelectorAll('span.xml-Sentence[data-item="'+ referredNum +'"]')
                linkSentences.forEach(linkSentence=>{
                    if (linkSentence){
                        linkSentence.innerHTML = linkSentence.innerHTML.replace(words, `<span class="hovered" ${lawData}>${words}</span>`);

                    };
                    hovered = linkSentence.querySelectorAll('.hovered');
                    hovered.forEach(itm=>{
                        setupLink(itm);
                    });
                });
            });
        })
        .catch(error => console.error('データの読み込みに失敗しました:', error))

}

function setupLink(itm) {
    frameContent = document.getElementById('reference');
    itm.addEventListener('click', async (event) => {
        frameContent.style.opacity = 1;
        frameContent.style.zIndex = 99;
        // let lawArticleParagraph = itm.innerHTML
        // // 参照する条文の中に（元号○○年法律/政令/...第○号）や（元号○○年法律/政令/...第○号。以下「○○法」という。）があれば除去する
        // const removeregex = /（((?:令和|平成|昭和|大正|明治)[一二三四五六七八九十]+年(?:法律|政令|省令|内閣府令)第[一二三四五六七八九十百千万]+号)?。?(?:以下「(.*?)」という。)?）/g;
        // lawArticleParagraph = lawArticleParagraph.replaceAll(removeregex,'')
        const lawNum = itm.getAttribute('lawNum')
        const lawArticleNum = itm.getAttribute('article')
        const lawParagraphNum = itm.getAttribute('paragraph')
        lawTitle = frameContent.getElementsByClassName('article-num')[0];
        lawContent = frameContent.getElementsByClassName('law-content')[0];
        lawTitle.innerHTML = ''
        lawContent.innerHTML = ''

        const apiUrl = `https://elaws.e-gov.go.jp/api/1/articles;lawNum=${lawNum};${lawArticleNum?'article=' + lawArticleNum:''}${lawParagraphNum? ';paragraph='+ lawParagraphNum:''}`;
        fetch(apiUrl)
        .then(response => response.text())
        .then(str => new window.DOMParser().parseFromString(str, "application/xml"))
        .then(data => {
            lawTitle.innerHTML = xmlData[lawNum] + ' ' + convertToArticleFormat(lawArticleNum);
            // // 第○項の部分は不要（記載している）ので削除する→政令等を見に行く場合はわからないことがあるのでそのまま残すことにする
            // paragraphNums = data.querySelectorAll('ParagraphNum')
            // paragraphNums.forEach(paragraphNum=>{
            //     paragraphNum.remove();
            // });
            // 第○条の部分やキャプションは不要なので削除する
            captions = data.querySelectorAll('ArticleCaption')
            captions.forEach(caption=>{
                caption.remove();
            });
            articletitles = data.querySelectorAll('ArticleTitle')
            articletitles.forEach(articletitle=>{
                articletitle.remove();
            });
            lawContent.innerHTML = data.getElementsByTagName('LawContents')[0].innerHTML;
        })
        .catch(error =>{
            console.error('データ取得失敗:',error)
        })
    });
};
function convertToArticleFormat(input) {
    // アンダースコアで分割して配列にする
    if (input){

        const parts = input.split('_');

        // 最初の部分を「第◯条」に変換
        let result = `第${parts[0]}条`;

        // 残りの部分があれば「の◯」を追加
        for (let i = 1; i < parts.length; i++) {
            result += `の${parts[i]}`;
        }

        return result;
    } else {
        return '';
    }
}
